import { useState, useCallback, useRef } from 'react';

/**
 * Real-time field validation hook.
 *
 * Usage:
 *   const { value, setValue, error, valid, onBlur, onChange } = useFieldValidation('', validateLRN);
 *
 * - Validates on blur (when user leaves the field).
 * - Validates on change only after first blur (so empty fields don't show errors immediately).
 * - Exposes `reset()` to clear state.
 */
const useFieldValidation = (initialValue = '', validator = () => ({ valid: true, message: '' }), opts = {}) => {
  const { validateOnMount = false } = opts;
  const [value, setValueRaw] = useState(initialValue);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  const runValidation = useCallback((v) => {
    const result = validator(v);
    setError(result.message || '');
    return result;
  }, [validator]);

  const setValue = useCallback((v) => {
    setValueRaw(v);
    if (touched) runValidation(v);
  }, [touched, runValidation]);

  const onBlur = useCallback(() => {
    setTouched(true);
    runValidation(value);
  }, [value, runValidation]);

  const onChange = useCallback((e) => {
    const v = typeof e === 'string' ? e : e.target.value;
    setValue(v);
  }, [setValue]);

  const reset = useCallback(() => {
    setValueRaw(initialValue);
    setError('');
    setTouched(false);
  }, [initialValue]);

  const result = touched ? runValidation(value) : { valid: false };
  const valid = !error && (touched ? result.valid : false);

  return { value, setValue, error, valid, touched, onBlur, onChange, reset, inputRef };
};

export default useFieldValidation;
