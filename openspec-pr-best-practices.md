# Add Trinity Workflow Best Practices - Context Persistence with planning-with-files

## Summary

This PR adds a best practices guide for integrating OpenSpec with persistent context management using the planning-with-files pattern. This pattern enables AI agents to maintain context across sessions through file-based tracking.

## What's Added

- New documentation: `docs/best-practices/context-persistence.md`
- Example integration with planning-with-files skill
- Multi-platform support (Claude Code + OpenCode)

## The Three Principles for AI-Driven Development

This best practice is built on three core principles:

### 1. Attention is All You Need
- Skills system precisely controls AI's attention scope
- Load only necessary context, avoid token waste

### 2. Context is All You Need
- Persistent context = Agent's "working memory"
- Tracking files as context anchors:
  - `task_plan.md` - Current phase, goals, task list
  - `findings.md` - Technical findings, Architecture Decision Records (ADR)
  - `progress.md` - Session progress log
  - `delta-log.md` - Delta Specs change records

### 3. System Agent Flow is All You Need
- Structured agent collaboration flow
- Three-phase architecture: planning-with-files → OpenSpec CLI → planning-with-files
- 3-Strike Protocol: Auto error handling, reduce manual intervention

## Why This Matters

| Problem | Traditional Approach | Trinity Approach |
|---------|---------------------|------------------|
| AI doesn't know current state | Re-explain every time | Read task_plan.md |
| AI forgets previous decisions | Repeat discussions | Read findings.md |
| AI doesn't know next step | Manual user guidance | Schema-driven flow |
| Error handling chaos | Random retries | 3-Strike Protocol |
| Context loss | Lost when session ends | File persistence |

## Integration Example

```yaml
# schema.yaml
tracking:
  enabled: true
  files:
    task_plan:
      path: "task_plan.md"
      description: "Phase, goals, decisions, error log"
    findings:
      path: "findings.md"
      description: "Technical findings, ADR"
    progress:
      path: "progress.md"
      description: "Session progress log"

  events:
    onArtifactCreate:
      - update: task_plan.md
      - update: progress.md
    onDecisionMade:
      - update: findings.md (ADR)
    onError:
      - update: task_plan.md (error log)
```

## Reference Implementation

A complete CLI tool implementing this pattern is available at:
- **Repository**: https://github.com/ql-wade/sdd-cli
- **NPM Package**: `sdd-ql-workflow`
- **Installation**: `npx sdd-ql-workflow init`

## Related

- planning-with-files skill: https://github.com/OthmanAdi/planning-with-files
- superpowers skill: https://github.com/obra/superpowers

---

Co-Authored-By: Trinity Workflow Team
