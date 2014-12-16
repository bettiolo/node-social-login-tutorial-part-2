'use strict';
var express = require('express');
var request = require('request');
var crypto = require('crypto');
var cache = require('memory-cache');
var uuid = require('node-uuid');
var router = express.Router();

router.post('/google/login', function (req, res) {
	var tokenInfoUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + req.body.access_token;
	request(tokenInfoUrl, function (err, apiRes, apiBody) {
		var tokenInfoResponse = JSON.parse(apiBody);
		if (err) {
			res.status(500);
			return res.json(err);
		} else {
			if (tokenInfoResponse.audience !== process.env.GOOGLE_CLIENT_ID) {
				return res.status(401);
			} else {
				crypto.randomBytes(128, function (err, buf) {
					if (err) {
						res.status(500);
						return res.json(err);
					}
					var sessionId = buf.toString('base64');
					cache.put('session:' + sessionId, tokenInfoResponse.user_id);
					res.json({ sessionId : sessionId });
					res.status(200);
				});
			}
		}
	});
});

router.get('/user', function (req, res) {
	var googleUser = req.body;
	var peopleUrl = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + googleUser.access_token;
	request(peopleUrl, function (err, apiRes, apiBody) {
		var peopleResponse = JSON.parse(apiBody);
		if (err) {
			res.status(500);
			return res.json(err);
		}
		res.status(401);
		res.json(peopleResponse);
		// Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==
		// displayName, id, domain, imageUrl
		//if (err) {
		//	res.status(500);
		//} else {
		//	if (tokenInfoResponse.audience !== process.env.GOOGLE_CLIENT_ID) {
		//		return res.status(401);
		//	} else {
		//		crypto.randomBytes(128, function (err, buf) {
		//			if (err) {
		//				res.status(500);
		//				return res.json(err);
		//			}
		//			var sessionId = buf.toString('base64');
		//			cache.put(sessionId, tokenInfoResponse.user_id);
		//			res.json({ sessionId : sessionId });
		//			res.status(200);
		//		});
		//	}
		//}
	});
});

module.exports = router;
