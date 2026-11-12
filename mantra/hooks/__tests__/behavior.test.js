describe('mantra behavior hook', () => {
  let hook;

  beforeEach(() => {
    jest.resetModules();
    hook = require('../behavior.js');
  });

  describe('BEHAVIOR constant', () => {
    it('contains anti-sycophancy stance', () => {
      expect(hook.BEHAVIOR).toContain('skeptical peer');
      expect(hook.BEHAVIOR).toContain('not an eager subordinate');
    });

    it('references skills', () => {
      expect(hook.BEHAVIOR).toContain('mantra:assess');
      expect(hook.BEHAVIOR).toContain('mantra:troubleshoot');
    });

    // This guards the removed injection requirement, not an agent's judgment.
    // Fresh behavioral comparisons verify how agents use the revised guidance.
    it('does not inject an external source quota on SessionStart', () => {
      const context = hook.processInput({ hook_event_name: 'SessionStart' })
        .hookSpecificOutput.additionalContext;

      expect(context).not.toMatch(/(?:minimum|at least|requires?)\s+(?:3|three)\s+(?:documented\s+)?(?:examples|sources)/i);
    });
  });

  describe('processInput', () => {
    it.each(['startup', 'clear'])('previews later reflection without requesting it on %s', source => {
      const result = hook.processInput({ hook_event_name: 'SessionStart', source });

      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('No reflection is needed now.');
      expect(result.hookSpecificOutput.additionalContext).not.toContain('Briefly recheck');
      expect(result).not.toHaveProperty('decision');
      expect(result).not.toHaveProperty('continue');
    });

    it.each(['resume', 'compact', undefined, 'unknown'])('delivers self-contained reflection on SessionStart source %s', source => {
      const result = hook.processInput({ hook_event_name: 'SessionStart', source });

      expect(result.hookSpecificOutput.additionalContext).toBe(hook.BEHAVIOR);
      expect(result.hookSpecificOutput.additionalContext).toContain('Briefly recheck');
      expect(result.hookSpecificOutput.additionalContext).not.toContain('No reflection is needed now.');
    });

    it('delivers active-objective guidance on SessionStart', () => {
      const context = hook.processInput({ hook_event_name: 'SessionStart' })
        .hookSpecificOutput.additionalContext;

      // Checks hook delivery; multi-turn agent comparisons establish behavior.
      expect(context).toContain('active user objective');
    });

    it.each(['startup', 'resume', 'compact', 'clear'])('delivers uncertainty-scope guidance on SessionStart (%s)', source => {
      const context = hook.processInput({ hook_event_name: 'SessionStart', source })
        .hookSpecificOutput.additionalContext;

      expect(context).toContain('An uncertainty about existing behavior is not, by itself, a requirement to change it or a blocker to the requested work.');
      expect(context).toContain('Preserve existing behavior outside the requested change.');
      expect(context).toContain("obtain the user's decision before implementing it.");
    });

    it('returns additionalContext on SessionStart', () => {
      const result = hook.processInput({
        hook_event_name: 'SessionStart'
      });

      expect(result.systemMessage).toContain('Mantra');
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toBe(hook.BEHAVIOR);
    });

    // #213: the guidance is injected once per session and again when compaction
    // drops it, never per prompt. Restating it made process guidance the last
    // thing read before every action, and it names no objective.
    it('injects nothing on UserPromptSubmit', () => {
      expect(hook.processInput({ hook_event_name: 'UserPromptSubmit' })).toEqual({});
    });

    it('returns empty object for unknown events', () => {
      const result = hook.processInput({
        hook_event_name: 'SomethingElse'
      });

      expect(result).toEqual({});
    });

    it('is not wired to UserPromptSubmit on either host', () => {
      for (const manifest of ['../hooks.json', '../codex.json']) {
        const events = require(manifest).hooks;
        const prompt = JSON.stringify(events.UserPromptSubmit);
        const start = JSON.stringify(events.SessionStart);

        expect(prompt).not.toContain('behavior.js');
        expect(start).toContain('behavior.js');
      }
    });
  });
});
