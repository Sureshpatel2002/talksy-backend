import fetch from 'node-fetch';

async function addDummyUser() {
  const dummyUser = {
    name: 'Dummy User',
    email: 'dummy@example.com',
    phone: '+19998887777',
    profilePicture: 'https://via.placeholder.com/150',
    bio: 'This is a dummy user',
    age: 30,
    gender: 'other',
    status: 'Hello from Dummy!'
  };

  try {
    const response = await fetch('http://localhost:3000/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dummyUser)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('User created successfully!');
      console.log('User UID:', data.data.user.uid);
    } else {
      console.error('Error creating user:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

addDummyUser(); 