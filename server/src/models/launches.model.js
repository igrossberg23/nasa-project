const axios = require('axios');

const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
	const response = await axios.post(SPACEX_API_URL, {
		query: {},
		options: {
			pagination: false,
			populate: [
				{
					path: 'rocket',
					select: {
						name: 1,
					},
				},
				{
					path: 'payloads',
					select: {
						customers: 1,
					},
				},
			],
		},
	});

	if (response.status !== 200) {
		console.log('Problem downloading launch data');
		throw new Error('Launch data download failed');
	}

	const launchDocs = response.data.docs;
	for (const launchDoc of launchDocs) {
		const payloads = launchDoc['payloads'];
		const customers = payloads.flatMap((payload) => payload['customers']);

		const launch = {
			flightNumber: launchDoc['flight_number'],
			mission: launchDoc['name'],
			rocket: launchDoc['rocket']['name'],
			launchDate: launchDoc['date_local'],
			target: 'N/A',
			customers: customers,
			upcoming: launchDoc['upcoming'],
			success: launchDoc['success'],
		};

		await saveLaunch(launch);
	}
}

async function loadLaunchData() {
	const firstLaunch = await findLaunch({
		flightNumber: 1,
		rocket: 'Falcon 1',
		mission: 'FalconSat',
	});

	if (firstLaunch) {
		console.log('Launch data already loaded');
		return;
	} else {
		console.log('Loading launch data...');
		await populateLaunches();
	}
}

async function findLaunch(filter) {
	return await launches.findOne(filter);
}

async function existsLaunchWithId(flightNumber) {
	const launch = await findLaunch({
		flightNumber,
	});

	return launch !== null;
}

async function getLatestFlightNumber() {
	const latestLaunch = await launches.findOne().sort('-flightNumber');
	if (latestLaunch) {
		return latestLaunch.flightNumber;
	}
	return DEFAULT_FLIGHT_NUMBER;
}

async function getAllLaunches(skip, limit) {
	return await launches
		.find({}, { _id: 0, __v: 0 })
		.sort({ flightNumber: 1 })
		.skip(skip)
		.limit(limit);
}

async function saveLaunch(launch) {
	await launches.updateOne(
		{
			flightNumber: launch.flightNumber,
		},
		{ ...launch },
		{
			upsert: true,
		}
	);
}

async function scheduleNewLaunch(launch) {
	const latestFlightNumber = (await getLatestFlightNumber()) + 1;

	const newLaunch = Object.assign(launch, {
		flightNumber: latestFlightNumber,
		success: true,
		upcoming: true,
		customers: ['Zero to Mastery', 'NASA'],
	});

	// Check that planet exists
	const planet = await planets.findOne({
		keplerName: launch.target,
	});

	if (!planet) {
		throw new Error('Matching planet not found: ' + launch.target);
	}

	await saveLaunch(newLaunch);
}

async function abortLaunchById(flightNumber) {
	const aborted = await launches.updateOne(
		{
			flightNumber,
		},
		{
			upcoming: false,
			success: false,
		}
	);

	return aborted.modifiedCount === 1;
}

module.exports = {
	loadLaunchData,
	existsLaunchWithId,
	getAllLaunches,
	scheduleNewLaunch,
	abortLaunchById,
};
