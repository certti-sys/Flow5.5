import { checkoutFormSchema } from '../src/types/checkout-form.ts';

const result = checkoutFormSchema.safeParse({
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  cpf: '52998224725',
  phone: '(11) 99999-9999',
  paymentMethod: 'pix'
});

if (!result.success) {
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

console.log('PASS: checkoutFormSchema aceita Pix sem campos de cartão');
