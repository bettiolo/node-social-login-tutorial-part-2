app.service('loginService', function ($rootScope, $timeout, $http) {
	'use strict';
	var _loginStatus = '';
	var _this = this;

	function setStatus(status) {
		if (_loginStatus != status ) {
			console.log('LoginService status: ' + status);
			_loginStatus = status;
		}
	}
	setStatus('logging_in');

	this.reset = function () {
		this.authStatus = null;
		this.user = null;
		this.session = null;
		this.existingUser = null;
	};
	this.reset();
	this.init = function () {
		$timeout(function () {
			gapi.signin.render('signInButton', {
				callback : function (authResult) { $timeout(function () { onSignInCallback(authResult); });
			}});
		});
	};
	this.getStatus = function () {
		return _loginStatus;
	};
	this.isBusy = function () {
		return this.getStatus() === 'logging_in'
			|| this.getStatus() === 'logging_out';
	};
	this.isLoggedIn = function () {
		return this.getStatus() === 'logged_in';
	};
	this.logout = function() {
		setStatus('logging_out');
		if (document.location.hostname == "localhost") {
			revokeToken(_this.authStatus.access_token);
		}
		gapi.auth.signOut();
		this.reset();
	};

	function revokeToken(access_token) {
		console.log('Disconnecting token', access_token);
		var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' + access_token;
		// Perform an asynchronous GET request.
		$http.jsonp(revokeUrl)
			.success(function (data, status, headers, config, statusText) {
				console.log('disconnectUser() Logged Out', data, status);
			})
			.error(function (data, status, headers, config, statusText) {
				console.log('disconnectUser() Error', data, status, statusText);
			});
	}

	function onSignInCallback(authResult) {
		if (_this.authStatus) {
			console.log('Already logged in.');
			return;
		}
		console.log('onSignInCallback() authResult:', authResult)
		_this.reset();
		if (authResult['status']['signed_in']) {
			_this.authStatus = authResult;
			authenticateGoogleUser();
		} else {
			setStatus('logged_out');
		}
	}

	function authenticateGoogleUser() {
		$http.post('api/google/authenticate', { access_token: _this.authStatus.access_token })
			.success(function (data) {
				_this.session = data;
				console.log('loginGoogleUser() POST ~/api/google/authenticate success:', _this.session);
				_this.existingUser = true;
				$http.defaults.headers.common.Authorization = 'Bearer ' + _this.session.sessionId;
				getUser();
			})
			.error(function (data, status) {
				if (status === 403) {
					console.log('loginGoogleUser() POST ~/api/google/authenticate user not signed up:', data, status);
					_this.existingUser = false;
					signupGoogleUser();
				} else {
					console.log('loginGoogleUser() POST ~/api/google/authenticate error:', data, status);
					setStatus('logged_out');
					_this.reset();
				}
			});
	}

	function signupGoogleUser() {
		$http.post('api/google/signup', { access_token: _this.authStatus.access_token })
			.success(function (data) {
				console.log('signupGoogleUser() POST ~/api/google/signup success:', data);
				authenticateGoogleUser();
			})
			.error(function (data, status) {
				console.log('signupGoogleUser() POST ~/api/google/signup error:', data, status);
				setStatus('logged_out');
				_this.reset();
			});
	}

	function getUser() {
		$http.get('api/user')
			.success(function (data) {
				_this.user = data;
				console.log('getUser() GET ~/api/user success:', _this.user);
				setStatus('logged_in');
			})
			.error(function (data, status) {
				console.log('getUser() GET ~/api/user error:', data, status);
				setStatus('logged_out');
				_this.reset();
			});
	}

});
