const BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

const TEST_STUDENT = {
    grNo: 'TEST_GR_999',
    rollNo: '99999',
    username: 'test_student_999',
    password: 'password123',
    department: 'Computer - AIML',
    class: 'SE',
    division: 'A',
    practicalBatch: 'A',
    eligibility: true
};

async function post(url, data, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok) throw { response: { status: res.status, data: json } };
    return { data: json };
}

async function get(url, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    const json = await res.json();
    if (!res.ok) throw { response: { status: res.status, data: json } };
    return { data: json };
}

async function del(url, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { method: 'DELETE', headers });
    const json = await res.json();
    if (!res.ok) throw { response: { status: res.status, data: json } };
    return { data: json };
}

async function runTest() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await post(`${BASE_URL}/auth/admin/login`, ADMIN_CREDENTIALS);
        const token = loginRes.data.token;
        console.log('   Login successful. Token received.');

        console.log('\n2. Registering/Ensuring Test Student exists...');
        try {
            await post(`${BASE_URL}/students/register`, TEST_STUDENT, token);
            console.log('   Student registered.');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('   Student likely already exists.');
            } else {
                throw e;
            }
        }

        console.log('\n3. Testing Bulk Eligibility Update (Setting to Defaulter)...');
        const defaulterPayload = [
            { grNo: TEST_STUDENT.grNo, defaulter: 'Yes' }
        ];
        const updateRes = await post(`${BASE_URL}/students/bulk-eligibility`, defaulterPayload, token);
        console.log('   Update response:', updateRes.data);

        console.log('\n4. Verifying Student Eligibility is FALSE...');
        const verifyRes = await get(`${BASE_URL}/students?class=SE`, token);
        const student = verifyRes.data.data.find(s => s.grNo === TEST_STUDENT.grNo);

        if (student) {
            console.log(`   Student Eligibility: ${student.eligibility}`);
            if (student.eligibility === false) {
                console.log('   SUCCESS: Student is marked as not eligible.');
            } else {
                console.error('   FAILURE: Student should be ineligible.');
            }
        } else {
            console.error('   FAILURE: Student not found in list.');
        }

        console.log('\n5. Testing Bulk Eligibility Update (Setting to NON-Defaulter)...');
        const nonDefaulterPayload = [
            { grNo: TEST_STUDENT.grNo, defaulter: 'No' }
        ];
        await post(`${BASE_URL}/students/bulk-eligibility`, nonDefaulterPayload, token);
        console.log('   Update sent.');

        const verifyRes2 = await get(`${BASE_URL}/students?class=SE`, token);
        const student2 = verifyRes2.data.data.find(s => s.grNo === TEST_STUDENT.grNo);
        if (student2 && student2.eligibility === true) {
            console.log('   SUCCESS: Student is marked as eligible again.');
        } else {
            console.error(`   FAILURE: Student should be eligible. Got: ${student2?.eligibility}`);
        }

        console.log('\n6. Cleanup...');
        if (student) {
            await del(`${BASE_URL}/students/${student._id}`, token);
            console.log('   Test student deleted.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.response ? JSON.stringify(error.response.data) : error);
    }
}

runTest();
