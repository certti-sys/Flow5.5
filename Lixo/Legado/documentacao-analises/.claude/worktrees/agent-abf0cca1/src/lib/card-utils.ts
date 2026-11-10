
export const cardUtils = {
    normalizeCardNumber: (value: string) => {
        return value.replace(/\D/g, "").slice(0, 16);
    },

    maskCardNumber: (value: string) => {
        const v = value.replace(/\D/g, "").slice(0, 16);
        return v.replace(/(\d{4})/g, "$1 ").trim();
    },

    maskExpirationDate: (value: string) => {
        const v = value.replace(/\D/g, "").slice(0, 4);
        if (v.length >= 3) {
            return `${v.slice(0, 2)}/${v.slice(2)}`;
        }
        return v;
    },

    maskCVV: (value: string) => {
        return value.replace(/\D/g, "").slice(0, 4);
    },

    validateLuhn: (value: string) => {
        const stripped = value.replace(/\D/g, "");
        if (stripped.length < 13) return false;

        let sum = 0;
        let shouldDouble = false;

        for (let i = stripped.length - 1; i >= 0; i--) {
            let digit = parseInt(stripped.charAt(i));

            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }

        return sum % 10 === 0;
    },

    validateExpirationDate: (value: string) => {
        if (!/^\d{2}\/\d{2}$/.test(value)) return false;

        const [month, year] = value.split('/').map(Number);
        const currentYear = new Date().getFullYear() % 100; // 2 digits
        const currentMonth = new Date().getMonth() + 1;

        if (month < 1 || month > 12) return false;
        if (year < currentYear) return false;
        if (year === currentYear && month < currentMonth) return false;

        return true;
    },

    validateCPF: (cpf: string) => {
        const v = cpf.replace(/\D/g, "");
        if (v.length !== 11) return false;
        if (/^(\d)\1+$/.test(v)) return false;

        let sum = 0;
        let remainder;

        for (let i = 1; i <= 9; i++) sum = sum + parseInt(v.substring(i - 1, i)) * (11 - i);
        remainder = (sum * 10) % 11;

        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(v.substring(9, 10))) return false;

        sum = 0;
        for (let i = 1; i <= 10; i++) sum = sum + parseInt(v.substring(i - 1, i)) * (12 - i);
        remainder = (sum * 10) % 11;

        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(v.substring(10, 11))) return false;

        return true;
    },

    maskCPF: (value: string) => {
        const v = value.replace(/\D/g, "");
        if (v.length <= 11) {
            return v
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})/, "$1-$2")
                .replace(/(-\d{2})\d+?$/, "$1");
        }
        // CNPJ
        return v
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .replace(/(-\d{2})\d+?$/, "$1");
    },

    maskPhone: (value: string) => {
        const v = value.replace(/\D/g, "");
        if (v.length <= 10) {
            return v
                .replace(/(\d{2})(\d)/, "($1) $2")
                .replace(/(\d{4})(\d)/, "$1-$2")
                .replace(/(-\d{4})\d+?$/, "$1");
        }
        return v
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .replace(/(-\d{4})\d+?$/, "$1");
    }
};
