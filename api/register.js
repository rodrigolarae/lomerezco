// api/register.js
// Recibe nombre, fecha, correo → guarda en Supabase → genera código

module.exports = async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, fecha_nacimiento, correo } = req.body;

  // Validaciones básicas
  if (!nombre || !fecha_nacimiento || !correo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Generar código de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = new Date(Date.now() + 10 * 60 * 1000); // expira en 10 min

  // Guardar en Supabase
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      nombre,
      fecha_nacimiento,
      correo,
      codigo_verificacion: codigo,
      codigo_expira: expira.toISOString(),
      verificado: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: 'Error guardando usuario', detalle: err });
  }

  // Enviar correo con Resend (lo activamos en el Paso 3)
  // Por ahora solo devolvemos el código para pruebas
  return res.status(200).json({
    ok: true,
    mensaje: 'Usuario registrado. Código generado.',
    codigo_demo: codigo  // ← esto lo quitamos en producción
  });
}
