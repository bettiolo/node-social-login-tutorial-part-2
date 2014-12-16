app.controller('navController', function ($scope, $location, loginService) {
	'use strict';
	$scope.login = loginService;
	$scope.getProfileImageUrl = function () {
		if ($scope.login.isLoggedIn()) {
			return $scope.login.user.image.url.replace('sz=50', 'sz=48');
		}
		return 'images/unknown.png';
	}
});
