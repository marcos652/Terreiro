import type { NextApiRequest, NextApiResponse } from 'next';
import { addUser } from '../../services/userService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await addUser({
      name: 'Usuário Teste',
      email: 'teste@teste.com',
      password: '',
      role: 'VISUALIZADOR',
      status: 'APROVADO',
      created_at: new Date().toISOString(),
    });
    return res.status(200).json({ message: 'Usuário teste inserido!' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
