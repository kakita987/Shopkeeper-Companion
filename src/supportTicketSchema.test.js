import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSupportTicketIssue, validateSupportTicketSubmission } from './supportTicketSchema.js'

test('buildSupportTicketIssue creates title, body, labels, and metadata', () => {
  const validation = validateSupportTicketSubmission({
    type: 'bug',
    summary: 'Cannot save blueprint',
    fields: {
      issue: 'Save button does nothing',
      steps: '1. Open app\n2. Click save',
      expected: 'Blueprint should save',
      additional: 'Happens on Safari',
    },
    sourcePage: 'https://example.test/#support',
    userAgent: 'UnitTestAgent/1.0',
  })

  assert.equal(validation.ok, true)
  const issue = buildSupportTicketIssue(validation.value, ['https://img.test/screen-1.png'])

  assert.equal(issue.title, '[Bug] Cannot save blueprint')
  assert.deepEqual(issue.labels, ['bug'])
  assert.match(issue.body, /### Ticket Type/)
  assert.match(issue.body, /### Summary/)
  assert.match(issue.body, /### Screenshots/)
  assert.match(issue.body, /Source Page: https:\/\/example.test\/#support/)
  assert.match(issue.body, /User Agent: UnitTestAgent\/1.0/)
})
