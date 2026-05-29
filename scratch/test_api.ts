// Use native fetch

async function test(text: string) {
  console.log(`\nTEST INPUT: "${text}"`);
  try {
    const res = await fetch('http://localhost:3001/api/ai/analyze-backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

async function run() {
  await test("Escuchas de llamadas de ayer");
  await test("Revisar grabaciones del equipo de soporte");
}

run();
