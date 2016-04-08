/* global excelUpload, angular */

//Controller for home
excelUpload.controller('HomeController',function($scope) {
	
	$scope.manageTemplateAction =  function(){
		window.location.assign("#manage-templates");
	};
	
	$scope.dataImportAction =  function(){
		window.location.assign("#data-import");
	};
	
	$scope.settingAction =  function(){
		window.location.assign("#settings");
	};
});