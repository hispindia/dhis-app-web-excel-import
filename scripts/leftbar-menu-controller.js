/* global excelUpload */

//Controller for column show/hide
excelUpload.controller('LeftBarMenuController',
        function($scope,
                $location) {
                    
    $scope.showExcelUpload = function(){
        $location.path('/').search();
    }; 
    
    $scope.showExcelMapping = function(){
        $location.path('/excel-mapping').search();
    };
});