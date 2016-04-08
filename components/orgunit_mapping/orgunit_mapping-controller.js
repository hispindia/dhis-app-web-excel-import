/* global excelUpload, angular */

//Controller for managing templates
excelUpload.controller('OrgUnitMappingController',
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
					
	
	//needed variables
	$scope.orgUnits = {};
	$scope.orgMappings = {};
	
	//retrieving all the needed things
	//**************************************************************************************************************
	
	//orgMappings
	$("#templateProgress").html("Retrieving settings...");
	ExcelMappingService.get('Excel-import-app-orgunit-mapping').then(function(tem){
		if(!jQuery.isEmptyObject(tem))
			$scope.orgMappings = tem;
		else
			$scope.orgMappings = { omapping : [] };
		
		console.log( $scope.orgMappings );
		
		//org units
		$("#templateProgress").html("Fetching all organisation units...");
		$.get('../api/organisationUnits.json?paging=false', function(ou){
			console.log( ou );
			$scope.orgUnits = ou.organisationUnits;
			$scope.printLabels();
			$("#loader").hide();
		}).
		fail(function(jqXHR, textStatus, errorThrown){
			$("#templateProgress").html("Failed to fetch organisation unit groups ( " + errorThrown + " )");
		});
	});
	//**************************************************************************************************************
	
	$scope.printLabels = function(){
		setTimeout(
			function()
			{
				if( $("#selOrgId").val() != "" )
				{
					var isFound = false;
					var htmlString = '<tr><td colspan="2" align="center"> Labels of ' + $("#selOrgName").val() + '</td></tr>';
					$.each( $scope.orgMappings.omapping, function( i, m){
						
						if( m.orgUnit == $("#selOrgId").val() )
						{
							isFound = true;
							htmlString += '<tr>';
							htmlString += '<td>' + m.label + '</td>';
							var ev = "removeLabel('" + m.label + "')";
							htmlString += '<td align="right"> <input type="button" style="padding: 0 10px;" class="btn btn-danger" value="X" onclick="'+ ev +'"/> </td>';
							htmlString += '</tr>';
						}
					});
					
					if( !isFound )
						htmlString = '<tr><td colspan="2" align="center"> No labels found for ' + $("#selOrgName").val() + '</td></tr>';
					$("#lblTbl").html( htmlString );
					
					$("#errMsg").html("");
					$("#errMsg").slideUp();
				}
			} 
		, 500 );
	};
	
	$scope.addMapping = function(){
		var found = $scope.isMappingFound($("#newLabel").val());
		
		if( $("#newLabel").val() == "" )
		{
			$("#errMsg").html("Label cannot be empty");
			$("#errMsg").slideDown();
		}
		else if( !found )
		{
			var newMapping = {};
			newMapping.label = $("#newLabel").val();
			newMapping.orgUnit = $("#selOrgId").val();
			$("#errMsg").html("");
			$("#errMsg").slideUp();
			$("#newLabel").val("");
			
			$scope.orgMappings.omapping.push( newMapping );
			$scope.printLabels();
			$scope.saveMapping();
		}
		else
		{
			$("#errMsg").html("This label is already taken under " + found );
			$("#errMsg").slideDown();
		}
	};
	
	$scope.isMappingFound = function( label ){
		var found = false;
		
		$.each( $scope.orgMappings.omapping, function( i, m){
			if( m.label == label )
			{
				$.each($scope.orgUnits, function( i, o){
					if( m.orgUnit == o.id )
						found = o.name;
				});
			}
		});
		
		console.log( found );
		return found;		
	};
	
	$scope.removeLabel= function( label ){
		var removeIndex = -1;
		
		$.each( $scope.orgMappings.omapping, function( i, m){
			if( m.label == label )
				removeIndex = i;
		});
		
		if( removeIndex >= 0 )
		{
			$scope.orgMappings.omapping.splice( removeIndex , 1 );
			$scope.saveMapping();
			$scope.printLabels();
		}
	};
	
	$scope.saveMapping = function(){
		ExcelMappingService.save('Excel-import-app-orgunit-mapping',$scope.orgMappings ).then(function(r){
			//console.log(r);
		});
	};
});