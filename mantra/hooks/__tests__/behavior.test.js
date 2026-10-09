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
    it.each(['SessionStart', 'UserPromptSubmit'])('does not inject an external source quota on %s', hookEvent => {
      const context = hook.processInput({ hook_event_name: hookEvent })
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

    it.each(['SessionStart', 'UserPromptSubmit'])('delivers active-objective guidance on %s', hookEvent => {
      const context = hook.processInput({ hook_event_name: hookEvent })
        .hookSpecificOutput.additionalContext;

      // Checks hook delivery; multi-turn agent comparisons establish behavior.
      expect(context).toContain('active user objective');
    });

    it('returns additionalContext on SessionStart', () => {
      const result = hook.processInput({
        hook_event_name: 'SessionStart'
      });

      expect(result.systemMessage).toContain('Mantra');
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toBe(hook.BEHAVIOR);
    });

    it('returns additionalContext on UserPromptSubmit', () => {
      const result = hook.processInput({
        hook_event_name: 'UserPromptSubmit'
      });

      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toBe(hook.BEHAVIOR);
    });

    it('returns empty object for unknown events', () => {
      const result = hook.processInput({
        hook_event_name: 'SomethingElse'
      });

      expect(result).toEqual({});
    });

    it('injects same content on SessionStart and UserPromptSubmit', () => {
      const sessionStart = hook.processInput({ hook_event_name: 'SessionStart' });
      const promptSubmit = hook.processInput({ hook_event_name: 'UserPromptSubmit' });

      expect(sessionStart.hookSpecificOutput.additionalContext)
        .toBe(promptSubmit.hookSpecificOutput.additionalContext);
    });
  });
});
