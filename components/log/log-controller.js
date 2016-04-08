/* global excelUpload, angular */

//Controller for excel importing
excelUpload.controller('LogController',
        function($rootScope,
                $scope,
                $timeout,
                $route,
                $filter,
                ExcelMappingService,
                ValidationRuleService,
                CurrentSelection,
                ExcelReaderService,
                MetaDataFactory,
                orderByFilter,
                OrgUnitService,
                DialogService) {
    
	$scope.history = {};
	
	//history
	$("#templateProgress").html("Retrieving all the import history...");
	ExcelMappingService.get('Excel-import-app-history').then(function(his){
		$scope.history = jQuery.isEmptyObject( his ) ? JSON.parse('{"history" : []}') : his;
		
		var htmlString = "";
		
		$.each( $scope.history.history , function(i,h){
			htmlString += "<tr>";
			htmlString += "<td>" + h.dataSet + "</td>";
			htmlString += "<td>" + h.period + "</td>";
			htmlString += "<td>" + h.time + "</td>";
			htmlString += "<td>" + h.template + "</td>";
			htmlString += "<td> <button class='btn btn-info' onclick='viewStats( " + i + " )' style='padding : 0px;width:70px'> Stats </button> <button class='btn btn-warning' style='padding : 0px;width:70px' onclick='viewMessage( " + i + " )' > Message </button> </td>";
			htmlString += "</tr>";
		});
		
		$("#tblHis").append(htmlString);
		$("#loader").hide();
	});
	
	$scope.viewMessage = function(h){
		var htmlString = "";
		
		htmlString += "<ol>";
		
		$.each( $scope.history.history[h].message , function(i, m){
			htmlString += "<li>" + m + "</li>";
		});
		
		htmlString += "</ol>";
		
		$("#confBdy").html( htmlString );
		$("#conflictModal").modal('show');
	};
	
	$scope.viewStats = function(h){
		$("#upc").html($scope.history.history[h].stats.upc);
		$("#imct").html($scope.history.history[h].stats.imc);
		$("#igc").html($scope.history.history[h].stats.igc);
		$("#stModal").modal('show');
	};
	
});