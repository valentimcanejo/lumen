// Map lessonId → cover image
// Replace placeholder entries with the real require() as images are added to assets/covers/

const placeholder = require("../assets/covers/placeholder.png");

const COVERS: Record<string, ReturnType<typeof require>> = {
  foundations:                  placeholder,
  foundations_mental_models:    placeholder,
  foundations_first_principles: placeholder,
  foundations_decision_making:  placeholder,
  geopolitics:                  placeholder,
  geopolitics_nato:             placeholder,
  geopolitics_brics:            placeholder,
  geopolitics_middle_east:      placeholder,
  geopolitics_china_usa:        placeholder,
  economics:                    placeholder,
  economics_inflation:          placeholder,
  economics_interest_rates:     placeholder,
  economics_fiscal_policy:      placeholder,
  critical_thinking:            placeholder,
  critical_thinking_fallacies:  placeholder,
  critical_thinking_bias:       placeholder,
};

export function getCoverImage(lessonId: string): ReturnType<typeof require> | null {
  return COVERS[lessonId] ?? null;
}
