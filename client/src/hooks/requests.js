const API_URL = 'http://localhost:8000/v1';

// Load planets and return as JSON.
async function httpGetPlanets() {
	const res = await fetch(`${API_URL}/planets`);
	return await res.json();
}

// Load launches, sort by flight number, and return as JSON.
async function httpGetLaunches() {
	const res = await fetch(`${API_URL}/launches`);
	const fetchedLaunches = await res.json();
	return fetchedLaunches.sort((a, b) => {
		return a.flightNumber - b.flightNumber;
	});
}

// Submit given launch data to launch system.
async function httpSubmitLaunch(launch) {
	try {
		const res = await fetch(`${API_URL}/launches`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(launch),
		});
		return res;
	} catch (err) {
		return {
			ok: false,
		};
	}
}

// Delete launch with given ID.
async function httpAbortLaunch(id) {
	try {
		const res = await fetch(`${API_URL}/launches/${id}`, {
			method: 'delete',
		});
		return res;
	} catch (err) {
		return {
			ok: false,
		};
	}
}

export { httpGetPlanets, httpGetLaunches, httpSubmitLaunch, httpAbortLaunch };
