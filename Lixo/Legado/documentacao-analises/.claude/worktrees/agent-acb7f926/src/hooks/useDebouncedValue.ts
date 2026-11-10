import { useState, useEffect } from "react";

/**
 * Hook para debounce de valores - útil para inputs de busca
 * @param value - Valor a ser debounced
 * @param delay - Delay em ms (padrão: 300ms)
 * @returns Valor após o delay
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook para debounce de callbacks - útil para funções de busca
 * @param callback - Função a ser debounced
 * @param delay - Delay em ms (padrão: 300ms)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): T {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const debouncedCallback = ((...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        const newTimeoutId = setTimeout(() => {
            callback(...args);
        }, delay);

        setTimeoutId(newTimeoutId);
    }) as T;

    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return debouncedCallback;
}
