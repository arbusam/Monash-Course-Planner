const UNIT_CODE_REGEX = /\b[A-Z]{3,4}\d{4}\b/g;
const UNIT_CODE_ONLY = /^[A-Z]{3,4}\d{4}$/i;

const parseSortValue = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const getRelationshipCode = (relationship) => {
  if (relationship?.academic_item_code) {
    return relationship.academic_item_code.toUpperCase();
  }

  const value = relationship?.academic_item?.value || '';
  const match = value.match(UNIT_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
};

const getConnector = (item, fallback = 'AND') => {
  const connector =
    item?.parent_connector?.value ||
    item?.connector?.value ||
    item?.connector ||
    fallback;

  return String(connector).toUpperCase() === 'OR' ? 'OR' : 'AND';
};

const getContainerSort = (container) => {
  if (container?.order) {
    return parseSortValue(container.order);
  }

  if (container?.title) {
    const match = container.title.match(/(\d+(?:\.\d+)*)$/);
    return match ? parseSortValue(match[1]) : Number.POSITIVE_INFINITY;
  }

  return Number.POSITIVE_INFINITY;
};

const getRelationshipSort = (relationship) => {
  if (relationship?.order) {
    return parseSortValue(relationship.order);
  }

  return Number.POSITIVE_INFINITY;
};

const evaluateContainer = (container, completedCodes) => {
  const items = [];
  const groupConnector = getConnector(container, 'AND');

  // Child containers are combined with *this* container's connector.
  // Each child's own parent_connector applies inside that child (e.g. an OR group).
  (container?.containers || []).forEach((child) => {
    items.push({
      kind: 'container',
      connector: groupConnector,
      sortValue: getContainerSort(child),
      value: evaluateContainer(child, completedCodes)
    });
  });

  (container?.relationships || []).forEach((relationship) => {
    const code = getRelationshipCode(relationship);
    if (!code) {
      return;
    }

    items.push({
      kind: 'relationship',
      connector: getConnector(relationship, groupConnector),
      sortValue: getRelationshipSort(relationship),
      code,
      value: completedCodes.has(code)
    });
  });

  if (items.length === 0) {
    return true;
  }

  items.sort((a, b) => a.sortValue - b.sortValue);

  let result = items[0].value;
  for (let i = 1; i < items.length; i += 1) {
    const item = items[i];
    result = item.connector === 'OR' ? result || item.value : result && item.value;
  }

  return result;
};

const collectCodesFromContainer = (container, outputSet) => {
  (container?.relationships || []).forEach((relationship) => {
    const code = getRelationshipCode(relationship);
    if (code) {
      outputSet.add(code);
    }
  });

  (container?.containers || []).forEach((child) => {
    collectCodesFromContainer(child, outputSet);
  });
};

const minifyContainer = (container) => {
  if (!container) {
    return null;
  }

  const relationships = (container.relationships || [])
    .map((relationship) => {
      const code = getRelationshipCode(relationship);
      if (!code) {
        return null;
      }

      return {
        academic_item_code: code,
        order: relationship.order,
        parent_connector: relationship.parent_connector
          ? { value: getConnector(relationship) }
          : undefined
      };
    })
    .filter(Boolean);

  const containers = (container.containers || [])
    .map(minifyContainer)
    .filter(Boolean);

  if (relationships.length === 0 && containers.length === 0) {
    return null;
  }

  return {
    title: container.title,
    order: container.order,
    parent_connector: container.parent_connector
      ? { value: getConnector(container) }
      : undefined,
    relationships,
    containers
  };
};

const minifyRule = (rule) => {
  const containers = (rule.containers || []).map(minifyContainer).filter(Boolean);
  const unitCodes = [...new Set(rule.unitCodes || [])];

  return {
    type: rule.type,
    unitCodes,
    containers
  };
};

const normalizeRuleType = (rawType) => {
  const type = (rawType || '').toString().toLowerCase();
  if (type.includes('prereq')) return 'prerequisite';
  if (type.includes('coreq')) return 'corequisite';
  if (type.includes('prohibit')) return 'prohibitions';
  return type;
};

const buildRuleFromCodes = (type, codes, connector = 'AND') => {
  const unitCodes = [...new Set(codes.map((code) => code.toUpperCase()))];
  if (unitCodes.length === 0) {
    return null;
  }

  return {
    type,
    unitCodes,
    containers: [
      {
        parent_connector: { value: connector },
        relationships: unitCodes.map((code, index) => ({
          academic_item_code: code,
          order: String(index + 1),
          parent_connector: { value: connector }
        })),
        containers: []
      }
    ]
  };
};

const stripHtml = (html) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractLinkedUnitCodes = (html) => {
  const codes = [];
  const linkRe = /href=["'][^"']*\/units\/([A-Za-z]{3,4}\d{4})[^"']*["']/gi;
  let match;
  while ((match = linkRe.exec(html)) !== null) {
    codes.push(match[1].toUpperCase());
  }
  return codes;
};

/**
 * Parse free-text enrolment rules such as:
 * "PHS2061 and one of MTH2010, MTH2015 or ENG2005 and one of MTH2032 or MTH2040"
 * into AND/OR groups.
 */
const parseRequirementGroups = (plainText, { allowedCodes = null, excludeCode = null } = {}) => {
  let text = stripHtml(plainText);
  if (!text) {
    return [];
  }

  // Drop "recommended" guidance that isn't a hard rule.
  if (/^\s*recommended\b/i.test(text)) {
    return [];
  }

  if (excludeCode) {
    // Avoid treating "enrolling in ENG2005" as a corequisite on ENG2005 itself.
    const selfRe = new RegExp(`\\b${excludeCode}\\b`, 'gi');
    text = text.replace(selfRe, ' ');
  }

  const groups = [];
  const tokenRe =
    /one\s+of\s+((?:[A-Z]{3,4}\d{4})(?:\s*,\s*[A-Z]{3,4}\d{4})*(?:\s+or\s+[A-Z]{3,4}\d{4})+)|([A-Z]{3,4}\d{4})/gi;
  let match;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match[1]) {
      let codes = (match[1].match(UNIT_CODE_REGEX) || []).map((code) => code.toUpperCase());
      if (allowedCodes) {
        codes = codes.filter((code) => allowedCodes.has(code));
      }
      if (codes.length > 0) {
        groups.push({ connector: 'OR', codes });
      }
    } else if (match[2]) {
      const code = match[2].toUpperCase();
      if (!allowedCodes || allowedCodes.has(code)) {
        groups.push({ connector: 'AND', codes: [code] });
      }
    }
  }

  // Pure "A or B or C" with no "one of" / "and" → single OR group
  if (
    groups.length > 1 &&
    groups.every((group) => group.connector === 'AND' && group.codes.length === 1) &&
    /^\s*[A-Z]{3,4}\d{4}(?:\s+or\s+[A-Z]{3,4}\d{4})+\s*$/i.test(text)
  ) {
    return [
      {
        connector: 'OR',
        codes: groups.flatMap((group) => group.codes)
      }
    ];
  }

  return groups;
};

const buildRuleFromGroups = (type, groups) => {
  if (!groups.length) {
    return null;
  }

  const unitCodes = [...new Set(groups.flatMap((group) => group.codes))];

  if (groups.length === 1) {
    return buildRuleFromCodes(type, groups[0].codes, groups[0].connector);
  }

  if (groups.every((group) => group.connector === 'AND' && group.codes.length === 1)) {
    return buildRuleFromCodes(type, unitCodes, 'AND');
  }

  const relationships = [];
  const containers = [];

  groups.forEach((group, index) => {
    if (group.connector === 'OR' || group.codes.length > 1) {
      containers.push({
        parent_connector: { value: 'OR' },
        order: String(index + 1),
        relationships: group.codes.map((code, codeIndex) => ({
          academic_item_code: code,
          order: String(codeIndex + 1)
        })),
        containers: []
      });
      return;
    }

    relationships.push({
      academic_item_code: group.codes[0],
      order: String(index + 1)
    });
  });

  return minifyRule({
    type,
    unitCodes,
    containers: [
      {
        parent_connector: { value: 'AND' },
        relationships,
        containers
      }
    ]
  });
};

const parseEnrolmentRuleDescription = (html, excludeCode = null) => {
  if (!html || typeof html !== 'string') {
    return [];
  }

  if (/recommended/i.test(html) && !UNIT_CODE_REGEX.test(html)) {
    return [];
  }

  const linkedCodes = extractLinkedUnitCodes(html);
  // Prefer handbook links when present so prose like "enrolling in ENG2005" is ignored.
  const allowedCodes = linkedCodes.length > 0 ? new Set(linkedCodes) : null;
  const parseOpts = { allowedCodes, excludeCode };

  const rules = [];
  const sectionPattern =
    /<strong[^>]*>\s*(prerequisites?|corequisites?|prohibitions?)\s*:?\s*<\/strong>\s*:?\s*([\s\S]*?)(?=<strong[^>]*>|$)/gi;
  let match;
  let matchedSection = false;

  while ((match = sectionPattern.exec(html)) !== null) {
    matchedSection = true;
    const type = normalizeRuleType(match[1]);
    const rule = buildRuleFromGroups(type, parseRequirementGroups(match[2] || '', parseOpts));
    if (rule) {
      rules.push(rule);
    }
  }

  if (matchedSection) {
    return rules;
  }

  // No <strong> heading — infer type from leading keyword in plain text
  const plain = stripHtml(html);
  const typeMatch = plain.match(/^\s*(prerequisites?|corequisites?|prohibitions?)\s*:?\s*/i);
  if (!typeMatch) {
    return [];
  }

  const type = normalizeRuleType(typeMatch[1]);
  const body = plain.slice(typeMatch[0].length);
  const rule = buildRuleFromGroups(type, parseRequirementGroups(body, parseOpts));
  return rule ? [rule] : [];
};

const parseEnrolmentRules = (enrolmentRules) => {
  const entries = [];

  if (typeof enrolmentRules === 'string') {
    entries.push({ description: enrolmentRules, excludeCode: null });
  } else if (Array.isArray(enrolmentRules)) {
    enrolmentRules.forEach((entry) => {
      if (typeof entry === 'string') {
        entries.push({ description: entry, excludeCode: null });
      } else if (entry?.description) {
        const excludeCode = (entry.academic_item?.value || '').toUpperCase() || null;
        entries.push({ description: entry.description, excludeCode });
      }
    });
  }

  const rules = [];
  entries.forEach(({ description, excludeCode }) => {
    parseEnrolmentRuleDescription(description, excludeCode).forEach((rule) => {
      rules.push(rule);
    });
  });

  return rules;
};

const parseStructuredRequisites = (requisites) => {
  if (!Array.isArray(requisites)) {
    return [];
  }

  return requisites
    .map((requisite) => {
      const type = normalizeRuleType(
        requisite?.requisite_type?.value || requisite?.requisite_type?.label || ''
      );
      const containers = Array.isArray(requisite?.container) ? requisite.container : [];
      const codes = new Set();
      containers.forEach((container) => collectCodesFromContainer(container, codes));

      return minifyRule({
        type,
        containers,
        unitCodes: [...codes]
      });
    })
    .filter((rule) => rule.type);
};

const mergeRulesByType = (primaryRules, fallbackRules) => {
  const byType = new Map();

  primaryRules.forEach((rule) => {
    byType.set(rule.type, rule);
  });

  fallbackRules.forEach((rule) => {
    if (!byType.has(rule.type)) {
      byType.set(rule.type, rule);
    }
  });

  return [...byType.values()];
};

export const isValidUnitCode = (code) => UNIT_CODE_ONLY.test(String(code || ''));

export const parseHandbookRequisites = (html) => {
  if (!html) {
    return [];
  }

  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!nextDataMatch) {
    return [];
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataMatch[1]);
  } catch {
    return [];
  }

  const pageContent = nextData?.props?.pageProps?.pageContent;
  const structured = parseStructuredRequisites(pageContent?.requisites);
  // Structured relationship-builder rules win per type; enrolment_rules fill gaps
  // (e.g. PHS3101 has empty requisites[] and HTML-only enrolment_rules).
  const fallback = parseEnrolmentRules(pageContent?.enrolment_rules);

  return mergeRulesByType(structured, fallback);
};

export const evaluateRequisite = (rule, completedCodes) => {
  const containers = Array.isArray(rule?.containers) ? rule.containers : [];

  if (containers.length === 0) {
    return true;
  }

  const containerResults = containers.map((container) => ({
    connector: getConnector(container),
    value: evaluateContainer(container, completedCodes)
  }));

  let result = containerResults[0].value;
  for (let i = 1; i < containerResults.length; i += 1) {
    const item = containerResults[i];
    result = item.connector === 'OR' ? result || item.value : result && item.value;
  }

  return result;
};

export const extractUnitCodes = (rules = []) => {
  const allCodes = new Set();
  rules.forEach((rule) => {
    (rule?.unitCodes || []).forEach((code) => {
      allCodes.add(code);
    });
  });
  return [...allCodes];
};
