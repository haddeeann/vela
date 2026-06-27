import { shouldPromptForExactAlarmSettings } from '../utils/exactAlarmSettings';

describe('exact alarm settings prompt', () => {
  it('prompts once on Android 12 and newer', () => {
    expect(
      shouldPromptForExactAlarmSettings({
        os: 'android',
        version: 31,
        hasPrompted: false,
      })
    ).toBe(true);
  });

  it('does not prompt when already shown or not Android 12+', () => {
    expect(
      shouldPromptForExactAlarmSettings({
        os: 'android',
        version: 31,
        hasPrompted: true,
      })
    ).toBe(false);
    expect(
      shouldPromptForExactAlarmSettings({
        os: 'android',
        version: 30,
        hasPrompted: false,
      })
    ).toBe(false);
    expect(
      shouldPromptForExactAlarmSettings({
        os: 'ios',
        version: 17,
        hasPrompted: false,
      })
    ).toBe(false);
  });
});
