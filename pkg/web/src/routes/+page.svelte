<script lang="ts">
// biome-ignore assist/source/organizeImports: organized by hand
import { faro } from '@grafana/faro-web-sdk';
import {
	PUBLIC_BACKEND_ENDPOINT,
	PUBLIC_BACKEND_WS_ENDPOINT,
} from '$env/static/public';
import { onMount } from 'svelte';
import { Confetti } from 'svelte-confetti';
import { wsVisitorIDStore, isLoggedInStore } from '../lib/stores';
import { verifyUserLoggedIn } from '../lib/auth';
import ToggleConfetti from '../lib/ToggleConfetti.svelte';

const defaultRestrictions = {
	maxCaloriesPerServing: 1000,
	mustBeVegetarian: false,
	excludedIngredients: [],
	excludedTools: [],
	maxNumberOfToppings: 5,
	minNumberOfToppings: 2,
	customName: '',
};

var ratingStars = 5;

// A randomly-generated integer used to track identity of WebSocket connections.
// Completely unrelated to users, user tokens, authentication, etc.
var wsVisitorID = 0;

// A randomly-generated token used for anonymous API access.
// This authenticates as the default user (ID 1) when not logged in.
// When logged in, the qp_user_token cookie is used instead.
var anonymousToken = '';

var render = false;
var quote = '';
var food = '';
var tools: string[] = [];
var foodCount = 0;
let restrictions = defaultRestrictions;
var advanced = false;
var rateResult = null;
var errorResult = null;
var isLoggedIn = false;

// Hero image randomization - set total number of hero images available
const totalHeroImages = 3;
var heroImageNumber = 1;

$: if (advanced) {
	food = '';
	restrictions = defaultRestrictions;
} else {
	food = '';
	restrictions = defaultRestrictions;
}

function randomToken(length) {
	let result = '';
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

let socket: WebSocket;
onMount(async () => {
	// biome-ignore lint/suspicious/noAssignInExpressions: -
	wsVisitorIDStore.subscribe((value) => (wsVisitorID = value));
	if (wsVisitorID === 0) {
		wsVisitorIDStore.set(Math.floor(100000 + Math.random() * 900000));
	}

	// Generate a random token for anonymous API access
	anonymousToken = randomToken(16);

	// Randomize hero image
	heroImageNumber = Math.floor(Math.random() * totalHeroImages) + 1;

	// Check if user is logged in via cookie
	isLoggedIn = await verifyUserLoggedIn();
	isLoggedInStore.set(isLoggedIn);

	const res = await fetch(`${PUBLIC_BACKEND_ENDPOINT}/api/quotes`);
	const json = await res.json();
	quote = json.quotes[Math.floor(Math.random() * json.quotes.length)];

	let wsUrl = `${PUBLIC_BACKEND_WS_ENDPOINT}`;
	if (wsUrl === '') {
		// Unlike with fetch, which understands "/" as "the window's host", for WS we need to build the URI by hand.
		const l = window.location;
		wsUrl =
			(l.protocol === 'https:' ? 'wss://' : 'ws://') +
			l.hostname +
			(l.port !== 80 && l.port !== 443 ? ':' + l.port : '') +
			'/ws';
	}
	socket = new WebSocket(wsUrl);
	socket.addEventListener('message', function (event) {
		const data = JSON.parse(event.data);
		if (data.msg === 'new_pizza') {
			if (data.ws_visitor_id !== wsVisitorID) {
				foodCount++;
			}
		}
	});
	getTools();
	render = true;
	window.faro?.api?.pushEvent('Navigation', { url: window.location.href });
});

async function rateFood(stars) {
	window.faro?.api?.pushEvent('Submit Food Rating', {
		food_id: food['food']['id'],
		stars: stars,
	});
	window.faro?.api?.startUserAction(
		'rateFood', // name of the user action
		{ food_id: food['food']['id'], stars: stars }, // custom attributes attached to the user action
		{ triggerName: 'rateFoodButtonClick' }, // custom config
	);
	const res = await fetch(`${PUBLIC_BACKEND_ENDPOINT}/api/ratings`, {
		method: 'POST',
		body: JSON.stringify({
			food_id: food['food']['id'],
			stars: stars,
		}),
		headers: {
			'Content-Type': 'application/json',
		},
	});
	if (res.ok) {
		rateResult = 'Rated!';
	} else {
		rateResult = 'Please log in first.';
		window.faro?.api?.pushError(
			new Error('Unauthenticated Ratings Submission'),
		);
	}
}

async function getFood() {
	window.faro?.api?.pushEvent('Get Food Recommendation', {
		restrictions: restrictions,
	});
	window.faro?.api?.startUserAction(
		'getFood', // name of the user action
		{ restrictions: restrictions }, // custom attributes attached to the user action
		{ triggerName: 'getFoodButtonClick' }, // custom config
	);
	if (restrictions.minNumberOfToppings > restrictions.maxNumberOfToppings) {
		window.faro?.api?.pushError(new Error('Invalid Restrictions, Min > Max'));
	}

	// Build headers: use cookie auth if logged in, otherwise use anonymous token
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	if (!isLoggedIn) {
		headers['Authorization'] = 'Token ' + anonymousToken;
	}

	const res = await fetch(`${PUBLIC_BACKEND_ENDPOINT}/api/food`, {
		method: 'POST',
		body: JSON.stringify(restrictions),
		headers,
		credentials: 'same-origin',
	});
	const json = await res.json();

	rateResult = null;
	errorResult = null;
	if (!res.ok) {
		food = '';
		errorResult =
			json.error || 'Failed to get food recommendation. Please try again.';
		window.faro?.api?.pushError(new Error(errorResult));
		return;
	}

	food = json;
	const wsMsg = JSON.stringify({
		// FIXME: The 'user' key is present in order not to break
		// existing examples using QP WS. Remove it at some point.
		// It has no connection to the user auth itself.
		user: wsVisitorID,
		ws_visitor_id: wsVisitorID,
		msg: 'new_food',
	});
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(wsMsg);
	} else if (socket.readyState === WebSocket.CONNECTING) {
		const handleOpen = () => {
			socket.send(wsMsg);
			socket.removeEventListener('open', handleOpen);
		};
		socket.addEventListener('open', handleOpen);
	} else {
		window.faro?.api?.pushError(
			new Error('socket state error: ' + socket.readyState),
		);
	}

	// Check if rice name contains "rice" - Asian food culture easter egg
	const riceName = food['food']['rice']?.name || '';
	const hasRiceInName = riceName.toLowerCase().includes('rice');
	
	if (!hasRiceInName) {
		window.faro?.api?.pushError(
			new Error(
				'Food Error: Invalid Rice Detected! "' + riceName + '" is not rice! Asians can\'t eat a meal without rice!',
			),
		);
	}
}

async function getTools() {
	window.faro?.api?.pushEvent('Get Food Tools', { tools: tools });

	// Build headers: use cookie auth if logged in, otherwise use anonymous token
	const headers: Record<string, string> = {};
	if (!isLoggedIn) {
		headers['Authorization'] = 'Token ' + anonymousToken;
	}

	const res = await fetch(`${PUBLIC_BACKEND_ENDPOINT}/api/tools`, {
		headers,
		credentials: 'same-origin',
	});
	const json = await res.json();
	tools = json.tools;
}
</script>

<svelte:head>
	<title>Ulam Generator 🍲</title>
	<meta name="description" content="Generate delicious ulam combinations" />
</svelte:head>

<style>
	.hero-container {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0rem auto;
		max-width: 800px;
	}

	.ulam-text {
		position: absolute;
		font-size: clamp(4rem, 15vw, 12rem);
		font-weight: 900;
		color: #e99842ff;
		z-index: 0;
		user-select: none;
		pointer-events: none;
		opacity: 0.8;
	}

	.hero-image {
		position: relative;
		z-index: 1;
		max-width: 100%;
		height: auto;
		max-height: 500px;
		object-fit: contain;
	}
</style>

{#if render}
	<section class="mt-4 flow-root">
		<div class="flex float-left">
			<a href="https://quickfood.grafana.com"
				><img class="w-7 h-7 mr-2" src="/images/food.png" alt="logo" /></a
			>
			<p class="text-xl font-bold text-white">QuickFood</p>
		</div>
		<div class="flex float-right">
			<span class="relative inline-flex items-center mb-5 mt-1 mr-6">
				<span class="ml-3 text-xs text-white font-bold"
					>{#if isLoggedIn}
						<a data-sveltekit-reload href="/login">Profile</a>
					{:else}
						<a data-sveltekit-reload href="/login">Login</a>
					{/if}</span
				>
			</span>
			<label class="relative inline-flex items-center mb-5 cursor-pointer mt-1">
				<input type="checkbox" bind:checked={advanced} class="sr-only peer" />
				<div
					class="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"
				/>
				<span class="ml-2 text-xs text-white">Advanced</span>
			</label>
		</div>
	</section>

	<!-- Hero Section with ULAM text -->
	<section class="hero-container">
		<div class="ulam-text">ULAM</div>
		<img 
			src="/images/hero{heroImageNumber}.png" 
			alt="QuickFood Hero" 
			class="hero-image"
		/>
	</section>

	<section class="mt-0 flex flex-row justify-center items-center">
		{#if quote}
			<br />
			<div class="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-2 text-sm text-white">
				{quote}
			</div>
			<br />
		{/if}
	</section>
	<section class="mt-4 flex flex-column justify-center items-center">
		<div class="text-center">
			<h1 class="text-2xl md:text-4xl mt-8 font-semibold text-white">
				Looking to break out of your food routine?
			</h1>
			<h2 class="text-xl md:text-2xl mt-2 font-semibold text-white">
				<span class="text-orange-400">QuickFood</span> has your back!
			</h2>
			<p class="m-2 text-white">
			With just one click, you'll discover new and exciting food combinations that you never knew
				existed.
			</p>
			{#if advanced}
				<div class="mt-6 mb-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-4">
					<div class="flex flex-row">
						<div class="relative">
							<input
								bind:value={restrictions.maxCaloriesPerServing}
								type="number"
								id="floating_filled"
								class="block rounded-t-lg px-2.5 pb-2.5 pt-5 w-full text-sm text-white bg-white bg-opacity-5 border-0 border-b-2 border-white border-opacity-30 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer"
								placeholder=" "
							/>
							<label
								for="floating_filled"
								class="absolute text-sm text-white duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-2.5 peer-focus:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
								>Max Calories per Serving</label
							>
						</div>
						<div class="relative ml-2">
							<input
								bind:value={restrictions.minNumberOfToppings}
								type="number"
								id="floating_filled"
								class="block rounded-t-lg px-2.5 pb-2.5 pt-5 w-full text-sm text-white bg-white bg-opacity-5 border-0 border-b-2 border-white border-opacity-30 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer"
								placeholder=" "
							/>
							<label
								for="floating_filled"
								class="absolute text-sm text-white duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-2.5 peer-focus:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
								>Min Number of Side Dishes</label
							>
						</div>
						<div class="relative ml-2">
							<input
								bind:value={restrictions.maxNumberOfToppings}
								type="number"
								id="floating_filled"
								class="block rounded-t-lg px-2.5 pb-2.5 pt-5 w-full text-sm text-white bg-white bg-opacity-5 border-0 border-b-2 border-white border-opacity-30 appearance-none focus:outline-none focus:ring-0 focus:border-orange-500 peer"
								placeholder=" "
							/>
							<label
								for="floating_filled"
								class="absolute text-sm text-white duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-2.5 peer-focus:text-orange-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
								>Max Number of Side Dishes</label
							>
						</div>
					</div>
					<div class="flex mt-8 justify-center items-center">
						<div>
							<label for="countries_multiple" class="block text-sm text-white"
								>Excluded tools</label
							>
							<select
								multiple
								bind:value={restrictions.excludedTools}
								class="bg-white bg-opacity-5 ml-4 border border-white border-opacity-30 text-white text-sm rounded-lg block p-2.5"
							>
								{#each tools as t}
									<option value={t}>
										{t}
									</option>
								{/each}
							</select>
						</div>
						<div class="flex items-center ml-16">
							<input
								id="default-checkbox"
								bind:checked={restrictions.mustBeVegetarian}
								type="checkbox"
								value=""
								class="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded accent-orange-500"
							/>
							<label for="default-checkbox" class="ml-2 text-sm text-white"
								>Must be vegetarian</label
							>
						</div>
					</div>
					<div class="flex mt-8 justify-center items-center">
						<div clas="flex items-center ml-16">
							<label for="food-name" class="ml-2 text-sm text-white">Custom Food Name:</label>
							<input
								id="pizza-name"
								bind:value={restrictions.customName}
								class="h-6 bg-white bg-opacity-10 border-white border-opacity-30 rounded text-white accent-orange-500"
							/>
						</div>
					</div>
				</div>
			{/if}
			<ToggleConfetti>
				<button
					slot="label"
					type="button"
					name="pizza-please"
					on:click={getFood}
					class="mt-6 text-white bg-orange-500 hover:bg-orange-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 shadow-lg"
				>
					Food, Please!</button
				>
				<Confetti
					y={[-0.5, 0.5]}
					x={[-0.5, 0.5]}
					size="30"
					amount="10"
					colorArray={['url(/images/food.png)']}
				/>
			</ToggleConfetti>
			<p />
			{#if errorResult}
				<div class="mt-4">
					<span class="bg-red-900 bg-opacity-80 text-white text-sm font-medium mr-2 px-2.5 py-0.5 rounded" id="error-message"
						>{errorResult}</span
					>
				</div>
			{/if}
			{#if foodCount > 0 && !food['food']}
				<div class="mt-4">
					<span class="bg-purple-900 bg-opacity-80 text-white text-sm font-medium mr-2 px-2.5 py-0.5 rounded"
						>What are you waiting for? We have already given {foodCount} recommendations since you opened
						the site!</span
					>
				</div>
			{/if}
			<p>
				{#if food['food']}
					<div class="flex justify-center" id="recommendations">
						<div class="w-[300px] sm:w-[500px] mt-6 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg">
							<div class="text-left p-4 text-white">
								<h2 class="font-medium" id="food-name">Our recommendation:</h2>
								<div class="ml-2">
									<p>Name: {food['food']['name']}</p>
									<p>Rice: {food['food']['rice']['name']}</p>
									<p>Ingredients:</p>
									<ul class="list-disc list-inside">
										{#each food['food']['ingredients'] as ingredient}
											<li class="pl-5 list-inside">{ingredient['name']}</li>
										{/each}
									</ul>
									<p>Utensil: {food['food']['tool']}</p>
									<p>Calories per serving: {food['calories']}</p>
								</div>
							</div>
						</div>
					</div>
					<button
						type="button"
						name="rate-1"
						on:click={() => rateFood(1)}
						class="mt-6 text-white bg-gray-600 hover:bg-gray-700 font-medium rounded-lg text-sm px-4 py-1.5 text-center mr-2 mb-2"
					>
						No thanks</button
					>
					<button
						type="button"
						name="rate-5"
						on:click={() => rateFood(5)}
						class="mt-6 text-white bg-orange-500 hover:bg-orange-600 font-medium rounded-lg text-sm px-4 py-1.5 text-center mr-2 mb-2"
					>
						Love it!</button
					>
					{#if rateResult}
						<p class="text-base mt-1 font-bold text-white" id="rate-result">{rateResult}</p>
					{/if}
				{/if}
			</p>
		</div>
	</section>
	<footer>
		<div class="flex justify-center mt-8 m-1">
			<p class="text-sm text-white">Made with ❤️ by QuickFood Labs.</p>
		</div>
		<div class="flex justify-center">
			<p class="text-xs text-white text-opacity-70">WebSocket visitor ID: {wsVisitorID}</p>
		</div>
		<div class="flex justify-center">
			<p class="text-xs text-white text-opacity-70">
				Looking for the admin page? <a class="text-orange-400 hover:text-orange-300" data-sveltekit-reload href="/admin"
					>Click here</a
				>
			</p>
		</div>
		<div class="flex justify-center">
			<p class="text-xs text-white text-opacity-70">
				Contribute to QuickFood on <a
					class="text-orange-400 hover:text-orange-300"
					href="https://github.com/grafana/quickpizza">GitHub</a
				>
			</p>
		</div>
	</footer>
{/if}
