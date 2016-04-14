/* global excelUpload, angular */

//Controller for managing templates
excelUpload.controller('TemplateController',
        function($rootScope,
                $scope,
                $timeout,
                $route,
                $filter,
                $modal,
				$log,
                ExcelMappingService,
                ValidationRuleService,
                CurrentSelection,
                ExcelReaderService,
                MetaDataFactory,
                orderByFilter,
                OrgUnitService,
                DialogService) {
					
	
	//needed variables
	$scope.orgUnitGroups = {};
	$scope.dataSets = {};
	$scope.templates = {};
    $scope.selectedTemp = {};
	
	//retrieving all the needed things
	//**************************************************************************************************************
	
	//templates
	$("#templateProgress").html("Retrieving all the saved templates...");
	ExcelMappingService.get('Excel-import-app-templates').then(function(tem){
		if(!jQuery.isEmptyObject(tem))
			$scope.templates = tem;
		else
			$scope.templates = { templates : [] };
		
		console.log( $scope.templates );
		
		//org unit group
		$("#templateProgress").html("Fetching organisation unit groups...");
		$.get('../api/organisationUnitGroups.json?paging=false', function(ou){
			console.log( ou );
			$scope.orgUnitGroups = ou.organisationUnitGroups;
			
			//datasets
			$("#templateProgress").html("Fetching all the data sets...");
			$.get('../api/dataSets.json?paging=false', function(ds){
				console.log( ds );
				$scope.dataSets = ds.dataSets;
				
				$scope.startBuilding();
				$("#loader").hide();
			}).
			fail(function(jqXHR, textStatus, errorThrown){
				$("#templateProgress").html("Failed to fetch data sets ( " + errorThrown + " )");
			});
		
		}).
		fail(function(jqXHR, textStatus, errorThrown){
			$("#templateProgress").html("Failed to fetch organisation unit groups ( " + errorThrown + " )");
		});
	});
	//**************************************************************************************************************
	
	//building UIs
	$scope.startBuilding = function(){
		$("#templateProgress").html("Making things ready...");
		$.each( $scope.dataSets , function( i, d ){
			$("#dataSetSelect").append("<option value='"+ d.id +"' > " + d.name +" </option>");
		});
		
		$.each( $scope.orgUnitGroups , function( i, o ){
			$("#orgUnitGroupSelect").append("<option value='"+ o.id +"' > " + o.name +" </option>");
		});
	};
	
	//**************************************************************************************************************
	
	//changing templates on changing OU group and Data Set
	$scope.validateSelection = function(){
		if( $("#dataSetSelect").val() != "" && $("#orgUnitGroupSelect").val() != "")
		{
			var htmlString = "";
			var tempFound = false;
			
			$.each( $scope.templates.templates , function( i , t ){
				if( t.dataSet == $("#dataSetSelect").val() && t.orgUnitGroup == $("#orgUnitGroupSelect").val() )
				{
					htmlString += "<option value = '" + t.id + "' > " + t.name + "</option>";
					tempFound = true;
				}
			});
			
			$("#templatesDiv").removeClass("disabled");
			
			if( tempFound )
			{
				$("#templateSelect").html(htmlString);
				$("#editTem").removeAttr("disabled");
				$("#delTem").removeAttr("disabled");
			}
			else
			{
				$("#templateSelect").html("<option> No templates found</option>");
				$("#editTem").attr("disabled" , "true");
				$("#delTem").attr("disabled" , "true");
			}
			
		}
		else
		{
			$("#templatesDiv").removeClass("disabled");	
			$("#templatesDiv").addClass("disabled");
			$("#templateSelect").html("<option> Select a data set and orgUnit group </option>");			
		}
	};
	
	$scope.storeTemp = function(){
		ExcelMappingService.save('Excel-import-app-templates',$scope.templates ).then(function(tem){
			//alert( tem );
			location.reload();
		});	
	};
	
	$scope.deleteTemp = function(){
		var r = confirm("Are you sure that you want to delete this template?");

		if (r == true)
		{
			var deletedIndex = -1;		
			
			$scope.templates.templates.forEach(function(te,index){
				
				if(te.id == $("#templateSelect").val())
				{
					deletedIndex = index;
				}
			});
			
			if( deletedIndex >= 0)
				$scope.templates.templates.splice( deletedIndex , 1 );
			
			$scope.storeTemp();
		}
	};
	
	$scope.viewTemp = function(){
		var selectedTemp = "";		
		
		$scope.templates.templates.forEach(function(te,index){
			if(te.id == $("#templateSelect").val())
			{
				selectedTemp = te;
			}
		});
		
		if( selectedTemp != "")
		{
			$("#loader").fadeIn();
			$("#templateProgress").html("");
			
			var t = "";
			
			if( selectedTemp.typeId == 1 && selectedTemp.rowMetaData == "d" )
				t = "Row Number";
			else if(  selectedTemp.typeId == 1 && selectedTemp.rowMetaData == "o" )
				t = "Column Number";
			else
				t = "Cell Address";
			
			var htmlString = "<tr><th>" + t + "</th><th> Data Element - COC </th></tr>";
			$.each( selectedTemp.DEMappings, function(i, m){
				
				if( selectedTemp.typeId == 1 && selectedTemp.rowMetaData == "d" )
					htmlString += "<tr><td>" + m.rowNumber + "</td><td> " + m.label + " </td></tr>";
				else if(  selectedTemp.typeId == 1 && selectedTemp.rowMetaData == "o" )
					htmlString += "<tr><td>" + m.colNumber + "</td><td> " + m.label + " </td></tr>";
				else
					htmlString += "<tr><td>" + m.cellNumber + "</td><td> " + m.label + " </td></tr>";
			});
			
			
			$("#sth").html( selectedTemp.name + " Template");
			$("#tblView").html(htmlString);
			$("#viewModal").modal("show");
			$("#loader").fadeOut();
		}
	};
	
	//***************************************************************************************
	$scope.addTemplateForm = function(){
		$rootScope.selectedTemplateType = $("#addTempType").val();
		$rootScope.selectedOrgGroup = $("#orgUnitGroupSelect").val();
		$rootScope.selectedDataSet = $("#dataSetSelect").val();
		
		window.location.assign('#add-template');
	};

    $scope.showEditTemp = function(){

		/* find index of selected temp */
		var selectedTempIndex = $scope.templates.templates.findIndex(function(temp,index){
			if(temp.id == $("#templateSelect").val())
			{
				return true;
			}
		});

		$scope.selectedTemp = angular.copy($scope.templates.templates[selectedTempIndex]);

        var modalInstance = $modal.open({
            templateUrl: 'components/edit_template/editTemplate.html',
            controller: 'EditTemplateController',
            resolve: {
                selectedTemp: function() {
                    return $scope.selectedTemp;
                }
            }
        });

		/* modifications to the templates are saved in here */
		modalInstance.result.then(function () {
			console.log("modified");
			console.log($scope.selectedTemp);
			$scope.templates.templates[selectedTempIndex] = $scope.selectedTemp;

			ExcelMappingService.save('Excel-import-app-templates',$scope.templates ).then(function(response){
				console.log(response);
				if(response.status!="OK"){
					alert(response.message+ " -- please see console for more info.");
					$log.error(response);
					return;
				}
				//$modalInstance.close();
				//location.reload();
				alert("successfully saved");
			});

		}, function () {
			$log.info('Modal dismissed at: ');
		});
    };
});