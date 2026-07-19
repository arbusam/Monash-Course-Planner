import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRequisite,
  getPriorStudyUnitCodes,
  parseHandbookRequisites
} from './requisites.js';

const handbookHtml = (description) => {
  const data = {
    props: {
      pageProps: {
        pageContent: {
          requisites: [],
          enrolment_rules: [{ description }]
        }
      }
    }
  };
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
};

const context = ({ codes = [], atar = null, subjects = [] } = {}) => ({
  completedCodes: new Set(codes),
  atar,
  vceSubjects: subjects
});

test('MTH1035 accepts its Monash or qualifying VCE alternatives', () => {
  const [rule] = parseHandbookRequisites(handbookHtml(
    '<strong>PREREQUISITE:</strong> VCE Specialist Mathematics with an ATAR/ENTER score of 95 or above; ' +
    'a VCE raw study score of 35 or above in Specialist Mathematics; ' +
    'a High Distinction in <a href="/2026/units/MTH1020">MTH1020</a>; or by approval of the unit coordinator.'
  ));

  assert.equal(evaluateRequisite(rule, context({ codes: ['MTH1020'] })), true);
  assert.equal(evaluateRequisite(rule, context({
    atar: 95,
    subjects: [{ subjectId: 'specialist-mathematics', studyScore: null }]
  })), true);
  assert.equal(evaluateRequisite(rule, context({
    subjects: [{ subjectId: 'specialist-mathematics', studyScore: 35 }]
  })), true);
  assert.equal(evaluateRequisite(rule, context({
    atar: 94.95,
    subjects: [{ subjectId: 'specialist-mathematics', studyScore: 34 }]
  })), false);
});

test('unit-or-VCE rule requires the stated study score', () => {
  const [rule] = parseHandbookRequisites(handbookHtml(
    '<strong>Prerequisite:</strong> <a href="/2026/units/MTH1010">MTH1010</a> or ' +
    'VCE Mathematical Methods units 3 and 4 with a raw study score of at least 25'
  ));

  assert.equal(evaluateRequisite(rule, context({ codes: ['MTH1010'] })), true);
  assert.equal(evaluateRequisite(rule, context({
    subjects: [{ subjectId: 'mathematical-methods', studyScore: 25 }]
  })), true);
  assert.equal(evaluateRequisite(rule, context({
    subjects: [{ subjectId: 'mathematical-methods', studyScore: null }]
  })), false);
});

test('existing structured unit-code rules still evaluate', () => {
  const rule = {
    containers: [{
      parent_connector: { value: 'OR' },
      relationships: [
        { academic_item_code: 'AAA1000' },
        { academic_item_code: 'BBB1000' }
      ]
    }]
  };
  assert.equal(evaluateRequisite(rule, new Set(['BBB1000'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['CCC1000'])), false);
});

test('one unit from A, B and one unit from C, D or E is AND of ORs', () => {
  const [rule] = parseHandbookRequisites(handbookHtml(
    '<p><strong>PREREQUISITE</strong>: One unit from ' +
    '<a href="/units/PHS1022">PHS1022</a>, <a href="/units/PHS1002">PHS1002</a> ' +
    'and one unit from <a href="/units/MTH1030">MTH1030</a>, ' +
    '<a href="/units/MTH1035">MTH1035</a> or <a href="/units/ENG1005">ENG1005</a></p>'
  ));

  assert.equal(evaluateRequisite(rule, new Set(['PHS1022', 'MTH1035'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['PHS1002', 'ENG1005'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['PHS1022'])), false);
  assert.equal(evaluateRequisite(rule, new Set(['MTH1035'])), false);
});

test('A or B and one of C, D or E is AND of ORs', () => {
  const [rule] = parseHandbookRequisites(handbookHtml(
    '<p><strong>PREREQUISITE:</strong> <a href="/units/PHS1022">PHS1022</a> or ' +
    '<a href="/units/PHS1002">PHS1002</a> and one of ' +
    '<a href="/units/MTH1030">MTH1030</a>, <a href="/units/MTH1035">MTH1035</a> or ' +
    '<a href="/units/ENG1005">ENG1005</a></p>'
  ));

  assert.equal(evaluateRequisite(rule, new Set(['PHS1022', 'MTH1035'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['PHS1002', 'MTH1030'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['PHS1022', 'PHS1002'])), false);
});

test('at least one of comma list is OR', () => {
  const [rule] = parseHandbookRequisites(handbookHtml(
    '<p><strong>PREREQUISITE</strong>: At least one of ' +
    '<a href="/units/MTH1035">MTH1035</a>, <a href="/units/MTH2025">MTH2025</a>, ' +
    '<a href="/units/MTH2121">MTH2121</a>, <a href="/units/FIT2014">FIT2014</a></p>'
  ));

  assert.equal(evaluateRequisite(rule, new Set(['MTH1035'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['FIT2014'])), true);
  assert.equal(evaluateRequisite(rule, new Set(['MTH1010'])), false);
});

test('plain-text prohibitions are not treated as prerequisites', () => {
  const rules = parseHandbookRequisites(handbookHtml(
    '<p>Prerequisite: Requires a minimum of 12 credit points of FIT units.<br />Prohibitions: FIT1049, FIT2003</p>'
  ));

  assert.equal(rules.some((rule) => rule.type === 'prerequisite'), false);
  const prohibition = rules.find((rule) => rule.type === 'prohibitions');
  assert.ok(prohibition);
  assert.deepEqual(prohibition.unitCodes.sort(), ['FIT1049', 'FIT2003']);
  assert.equal(evaluateRequisite(prohibition, new Set(['FIT1049'])), true);
  assert.equal(evaluateRequisite(prohibition, new Set(['FIT2003'])), true);
  assert.equal(evaluateRequisite(prohibition, new Set(['MTH1020'])), false);
});

test('VCE Algorithmics grants FIT1045 and FIT1053 prior credit', () => {
  const completedCodes = getPriorStudyUnitCodes({
    monashUnitCodes: [],
    vceSubjects: [{ subjectId: 'algorithmics-hess', studyScore: 40 }]
  });

  assert.equal(completedCodes.has('FIT1045'), true);
  assert.equal(completedCodes.has('FIT1053'), true);
  assert.equal(evaluateRequisite({
    containers: [{
      relationships: [{ academic_item_code: 'FIT1045' }]
    }]
  }, completedCodes), true);
});
