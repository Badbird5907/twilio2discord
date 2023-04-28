import { Router } from 'itty-router';

export interface Env {
	SECRET: string;
	WEBHOOK_URL: string;
}

// Create a new router
const router = Router();

router.get('/', () => {
	return Response.redirect('https://badbird.dev');
});

router.post('/post', async (req, env, ctx) => {
	try {
		// get SECRET from environment variables
		const { SECRET, WEBHOOK_URL } = env as Env;

		// check query string for secret
		const { query } = req;
		const { secret } = query;
		if (secret !== SECRET) {
			return new Response('Wrong secret', { status: 403 });
		}

		// Check if the request body is JSON or URL-encoded
		let data: any;
		if (req.headers.get('content-type')?.includes('application/json')) {
			data = await req.json();
		} else if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
			const formData = await req.formData();
			data = Object.fromEntries(formData.entries());
		} else {
			return new Response('Unsupported content type', { status: 415 });
		}
		// Get the SMS data from the request body
		const smsData = {
			from: data.From,
			content: data.Body
		};

		const response = await fetch(WEBHOOK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				embeds: [
					{
						title: 'SMS Received!',
						color: 0x0077ff,
						fields: [
							{
								name: 'From:',
								value: smsData.from,
								inline: true,
							},
							{
								name: 'Content:',
								value: smsData.content,
								inline: false,
							}
						]
					}
				]
			})
		});

		if (response.ok) {
			return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>', { status: 200 })
		} else {
			console.error(await response.text());
			return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message><Body>Error sending webhook!</Body></Message></Response>', { status: 500 })
		}
	} catch (e) {
		console.error(e)
		return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message><Body>Error: ${e}</Body></Message></Response>`, { status: 500 })
	}
});

router.all('*', () => new Response('404, not found!', { status: 404 }));

export default {
	fetch: router.handle,
};
