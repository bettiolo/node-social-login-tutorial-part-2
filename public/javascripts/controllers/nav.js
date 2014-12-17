app.controller('navController', function ($scope, $location, loginService) {
	'use strict';
	$scope.login = loginService;
	$scope.getProfileImageUrl = function () {
		if ($scope.login.isLoggedIn()) {
			return $scope.login.user.imageUrl + '?sz=48';
		}
		return 'images/unknown.png';
	}
});
