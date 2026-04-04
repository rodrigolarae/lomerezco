// api/verify.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { correo, codigo } = req.body;
  if (!correo || !codigo) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  // Buscar usuario en Supabase
  const url = `${process.env.SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&select=*`;
  const dbRes = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
    }
  });

  const usuarios = await dbRes.json();
  if (!usuarios.length) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const usuario = usuarios[0];

  // Verificar código y expiración
  if (usuario.codigo_verificacion !== codigo) {
    return res.status(400).json({ error: 'Código incorrecto' });
  }
  if (new Date() > new Date(usuario.codigo_expira)) {
    return res.status(400).json({ error: 'Código expirado, solicita uno nuevo' });
  }

  // Marcar como verificado en Supabase
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ verificado: true, codigo_verificacion: null })
  });

  return res.status(200).json({
    ok: true,
    nombre: usuario.nombre,
    mensaje: '¡Cuenta verificada!'
  });
}
