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
