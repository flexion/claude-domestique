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
  });

  describe('processInput', () => {
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
