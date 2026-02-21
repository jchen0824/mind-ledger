const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function test() {
  try {
    console.log('--- Testing Create Meeting ---');
    const meetingRes = await axios.post(`${BASE_URL}/meetings`, {
      title: 'Test Meeting',
      content: 'This is a test meeting. Discussion about project timeline. Action item: Bob to finish the report by Friday. Key point: Deadline is next week.'
    });
    console.log('Created Meeting:', meetingRes.data);
    const meetingId = meetingRes.data.id;

    console.log('\n--- Testing List Meetings ---');
    const listRes = await axios.get(`${BASE_URL}/meetings`);
    console.log('Meetings Count:', listRes.data.length);

    console.log('\n--- Testing Get Meeting Detail ---');
    const detailRes = await axios.get(`${BASE_URL}/meetings/${meetingId}`);
    console.log('Meeting Detail Title:', detailRes.data.title);

    console.log('\n--- Testing Chat ---');
    const chatRes = await axios.post(`${BASE_URL}/chat`, {
      query: 'What is the action item?',
      meetingId: meetingId
    });
    console.log('Chat Answer:', chatRes.data.answer);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

test();
