'use strict';
var express = require('express');
var request = require('request');
var crypto = require('crypto');
var cache = require('memory-cache');
var uuid = require('node-uuid');
var router = express.Router();

function validateTokenInfo(accessToken, cb) {
	var tokenInfoUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken;
	request(tokenInfoUrl, function (err, apiRes, apiBody) {
		var tokenInfoResponse = JSON.parse(apiBody);
		if (err) { return cb(err); }
		if (tokenInfoResponse.audience !== process.env.GOOGLE_CLIENT_ID) {
			return cb(null, null);
		} else {
			return cb(null, tokenInfoResponse);
		}
	});
}

function getUserProfile(accessToken, cb) {
	var peopleUrl = 'https://www.googleapis.com/plus/v1/people/me?access_token=' + accessToken;
	request(peopleUrl, function (err, apiRes, apiBody) {
		var peopleMeResponse = JSON.parse(apiBody);
		if (err) { cb(err) }
		cb(null, peopleMeResponse);
	});
}

function createToken(userId, cb) {
	crypto.randomBytes(128, function (err, buf) {
		if (err) { return cb(err); }
		var token = buf.toString('base64');
		var cacheKey = 'token:' + token;
		cache.put(cacheKey, userId);
		return cb(null, token);
	});
}

function createUser(linkedProfiles) {
	var newUser = {
		id : uuid.v4(),
		linkedProfiles : linkedProfiles
	};
	var cacheKey = 'user:' + newUser.id;
	cache.put(cacheKey, newUser);
	return newUser.id;
}

function mapGoogleUserId(googleUserId, userId) {
	var cacheKey = 'google-user-id:' + googleUserId;
	cache.put(cacheKey, userId);
}

function getUserIdByGoogleUserId(googleUserId) {
	var cacheKey = 'google-user-id:' + googleUserId;
	return cache.get(cacheKey);
}

function getUserIdByToken(token) {
	var cacheKey = 'token:' + token;
	return cache.get(cacheKey);
}

function getUserById(id) {
	var cacheKey = 'user:' + id;
	return cache.get(cacheKey);
}

router.post('/google/authenticate', function (req, res) {
	validateTokenInfo(req.body.access_token, function (err, tokenInfo) {
		if (err) {
			res.status(500);
			return res.json(err);
		}
		if (!tokenInfo) {
			return res.status(401);
		}
		var userId = getUserIdByGoogleUserId(tokenInfo.user_id);
		if (!userId) {
			res.status(403);
			return res.json({ error : 'User not found' });
		}
		createToken(userId, function (err, token) {
			if (err) {
				res.status(500);
				return res.json(err);
			}
			res.status(200);
			res.json({ token : token });
		});
	});
});

router.post('/google/signup', function (req, res) {
	var accessToken = req.body.access_token;
	validateTokenInfo(accessToken, function (err, tokenInfo) {
		if (err) {
			res.status(500);
			return res.json(err);
		}
		if (!tokenInfo) {
			return res.status(401);
		}
		getUserProfile(accessToken, function (err, linkedUserProfile) {
			if (err) {
				res.status(500);
				return res.json(err);
			}
			if (getUserIdByGoogleUserId(linkedUserProfile.id)) {
				res.status(409);
				return res.json({ error: 'User already exists'} );
			}
			var userId = createUser({ google: linkedUserProfile });
			mapGoogleUserId(linkedUserProfile.id, userId);
			res.status(201);
			res.end();
		});
	});
});

router.get('/user', function (req, res) {
	var token = null;
	if (req.headers.authorization) {
		var splittedAuthorization = req.headers.authorization.split(' ');
		if (splittedAuthorization.length == 2) {
			if (splittedAuthorization[0] === 'Bearer') {
				token = splittedAuthorization[1];
			}
		}
	}
	if (!token) {
		res.status(401);
		return res.json({ error : 'Bearer token must be specified in Authorisation header' });
	}
	var userId = getUserIdByToken(token);
	var user = getUserById(userId);
	user.emails = user.linkedProfiles.google.emails.map(function (email) { return email.value });
	user.name = user.linkedProfiles.google.displayName || user.emails[0];
	user.imageUrl = user.linkedProfiles.google.image.url.replace('?sz=50', '');
	user.domain = user.linkedProfiles.google.domain;
	res.status(200);
	res.json(user);
});

module.exports = router;

