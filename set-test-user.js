
const { addUser } = require('./src/services/userService');

async function seedTestUser() {
  await addUser({
    name: 'Usuário Teste',
    email: 'teste@teste.com',
    password: '',
    role: 'MEMBER',
    status: 'APROVADO',
    created_at: new Date().toISOString(),
  });
  console.log('Usuário teste inserido!');
}

seedTestUser();
