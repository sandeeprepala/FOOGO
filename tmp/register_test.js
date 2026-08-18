(async ()=>{
  try {
    const body = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password',
      phone_no: '9876543210',
      address: '123 Main St, Delhi',
      lat: 28.6139,
      lng: 77.2090
    };

    const res = await fetch('http://localhost:3010/auth/register/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('STATUS', res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('ERROR', e);
  }
})();
