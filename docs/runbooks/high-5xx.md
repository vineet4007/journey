# Runbook: High 5xx Spike
**Service:** <name>
**Detector:** Alert: HTTP 5xx > 2% for 5m
**Checks:**
- Pods healthy? `kubectl get pods`
- Recent deploy? `kubectl rollout history deploy/<name>`
- Upstream/downstream errors? Traces.

**Mitigation:**
- Rollback: `kubectl rollout undo deploy/<name>`
- Scale out: `kubectl scale deploy/<name> --replicas=2`
**Follow-up:** Postmortem in docs/weeklies.
