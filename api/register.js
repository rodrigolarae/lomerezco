module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, fecha_nacimiento, correo } = req.body;
  if (!nombre || !fecha_nacimiento || !correo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = new Date(Date.now() + 10 * 60 * 1000);

  // Verificar si el correo ya existe
  const checkRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}&select=id`,
    {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
      }
    }
  );
  const existing = await checkRes.json();

  if (existing.length > 0) {
    // Usuario ya existe — actualizar solo el código
    const updateRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/usuarios?correo=eq.${encodeURIComponent(correo)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          codigo_verificacion: codigo,
          codigo_expira: expira.toISOString(),
          verificado: false
        })
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return res.status(500).json({ error: 'Error actualizando usuario', detalle: err });
    }
  } else {
    // Usuario nuevo — insertar
    const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
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
    if (!insertRes.ok) {
      const err = await insertRes.text();
      return res.status(500).json({ error: 'Error guardando usuario', detalle: err });
    }
  }

  // Enviar correo con Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_KEY}`
    },
    body: JSON.stringify({
      from: 'lomerezco <onboarding@resend.dev>',
      to: correo,
      subject: 'Tu código de acceso — lomerezco.cl',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#111;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ffcc00,#ff0066);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:2em;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,0.3)">lomerezco.cl</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-style:italic">¿Lo necesitas o lo deseas?</p>
          </div>
          <div style="padding:32px;text-align:center">
            <p style="font-size:16px;color:rgba(255,255,255,0.85)">Hola <strong>${nombre}</strong>, aquí está tu código:</p>
            <div style="background:rgba(255,204,0,0.15);border:2px solid #ffcc00;border-radius:12px;padding:24px;margin:24px 0">
              <span style="font-size:3em;font-weight:900;letter-spacing:0.3em;color:#ffcc00">${codigo}</span>
            </div>
            <p style="font-size:13px;color:rgba(255,255,255,0.5)">Este código expira en <strong style="color:#fff">10 minutos</strong>.</p>
            <p style="font-size:13px;color:rgba(255,255,255,0.5)">Si no creaste esta cuenta, ignora este correo.</p>
          </div>
          <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.1);text-align:center">
            <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0">lomerezco.cl — Consciencia financiera con humor</p>
          </div>
        </div>
      `
    })
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    return res.status(500).json({ error: 'Error enviando correo', detalle: err });
  }

  return res.status(200).json({ ok: true, mensaje: 'Código enviado a tu correo' });
};
