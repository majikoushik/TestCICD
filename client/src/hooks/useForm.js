import { useState, useCallback } from 'react';
import { validateForm } from '../utils/validationUtils';

/**
 * Custom hook for form handling
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Form validation rules
 * @param {Function} onSubmit - Form submission handler
 * @returns {Object} Form methods and state
 */
export default function useForm(initialValues = {}, validationRules = {}, onSubmit = null) {
  // Form state
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  
  /**
   * Handle input change
   * 
   * @param {Event|string} eventOrField - Event object or field name
   * @param {any} valueOrEvent - Field value or event object
   */
  const handleChange = useCallback((eventOrField, valueOrEvent) => {
    // Handle different input types
    if (typeof eventOrField === 'string') {
      // Direct field name and value
      const field = eventOrField;
      const value = valueOrEvent;
      
      setValues(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        [field]: true
      }));
      
      // Validate field if rules exist
      if (validationRules[field]) {
        const fieldValidation = validateForm(
          { [field]: value },
          { [field]: validationRules[field] }
        );
        
        setErrors(prev => ({
          ...prev,
          [field]: fieldValidation.errors[field] || null
        }));
      }
    } else {
      // Event object
      const { name, value, type, checked } = eventOrField.target;
      const fieldValue = type === 'checkbox' ? checked : value;
      
      setValues(prev => ({
        ...prev,
        [name]: fieldValue
      }));
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
      
      // Validate field if rules exist
      if (validationRules[name]) {
        const fieldValidation = validateForm(
          { [name]: fieldValue },
          { [name]: validationRules[name] }
        );
        
        setErrors(prev => ({
          ...prev,
          [name]: fieldValidation.errors[name] || null
        }));
      }
    }
  }, [validationRules]);
  
  /**
   * Handle input blur
   * 
   * @param {Event} event - Blur event
   */
  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field if rules exist
    if (validationRules[name]) {
      const fieldValidation = validateForm(
        { [name]: values[name] },
        { [name]: validationRules[name] }
      );
      
      setErrors(prev => ({
        ...prev,
        [name]: fieldValidation.errors[name] || null
      }));
    }
  }, [validationRules, values]);
  
  /**
   * Validate the entire form
   * 
   * @returns {boolean} Whether the form is valid
   */
  const validateAll = useCallback(() => {
    if (Object.keys(validationRules).length === 0) {
      return true;
    }
    
    const validation = validateForm(values, validationRules);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
    
    // Mark all fields as touched
    const allTouched = Object.keys(validationRules).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(prev => ({
      ...prev,
      ...allTouched
    }));
    
    return validation.isValid;
  }, [values, validationRules]);
  
  /**
   * Handle form submission
   * 
   * @param {Event} event - Submit event
   */
  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault();
    }
    
    // Validate form
    const isFormValid = validateAll();
    
    if (isFormValid && onSubmit) {
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validateAll, onSubmit, values]);
  
  /**
   * Reset the form
   * 
   * @param {Object} newValues - New form values
   */
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsValid(true);
  }, [initialValues]);
  
  /**
   * Set a specific field value
   * 
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  const setFieldValue = useCallback((field, value) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validate field if rules exist
    if (validationRules[field]) {
      const fieldValidation = validateForm(
        { [field]: value },
        { [field]: validationRules[field] }
      );
      
      setErrors(prev => ({
        ...prev,
        [field]: fieldValidation.errors[field] || null
      }));
    }
  }, [validationRules]);
  
  /**
   * Set multiple field values
   * 
   * @param {Object} newValues - New field values
   */
  const setFieldValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
    
    // Validate fields if rules exist
    const fieldsToValidate = Object.keys(newValues).filter(field => validationRules[field]);
    
    if (fieldsToValidate.length > 0) {
      const fieldsValidation = validateForm(
        fieldsToValidate.reduce((acc, field) => {
          acc[field] = newValues[field];
          return acc;
        }, {}),
        fieldsToValidate.reduce((acc, field) => {
          acc[field] = validationRules[field];
          return acc;
        }, {})
      );
      
      setErrors(prev => ({
        ...prev,
        ...fieldsValidation.errors
      }));
    }
  }, [validationRules]);
  
  /**
   * Set a specific field error
   * 
   * @param {string} field - Field name
   * @param {string} error - Error message
   */
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    // Update form validity
    setIsValid(Object.values({ ...errors, [field]: error }).every(err => !err));
  }, [errors]);
  
  /**
   * Set multiple field errors
   * 
   * @param {Object} newErrors - New field errors
   */
  const setFieldErrors = useCallback((newErrors) => {
    setErrors(prev => ({
      ...prev,
      ...newErrors
    }));
    
    // Update form validity
    setIsValid(Object.values({ ...errors, ...newErrors }).every(err => !err));
  }, [errors]);
  
  /**
   * Check if a field has an error
   * 
   * @param {string} field - Field name
   * @returns {boolean} Whether the field has an error
   */
  const hasError = useCallback((field) => {
    return Boolean(touched[field] && errors[field]);
  }, [touched, errors]);
  
  /**
   * Get the error message for a field
   * 
   * @param {string} field - Field name
   * @returns {string} Error message
   */
  const getErrorMessage = useCallback((field) => {
    return touched[field] && errors[field] ? errors[field] : '';
  }, [touched, errors]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldValues,
    setFieldError,
    setFieldErrors,
    hasError,
    getErrorMessage,
    validateAll
  };
}
