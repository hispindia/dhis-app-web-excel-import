/* global excelUpload, angular */

//Controller for managing templates
excelUpload.controller('AddTemplateController',
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
	$scope.orgUnitGroups = {};
	$scope.dataSets = {};
	$scope.templates = {};
	$scope.commonPool = {};
	$scope.newTemplate = {};
	$scope.engAddress = ["","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
	$scope.tempCells = [];
	$scope.selectedDataSetInfo = {};
	
	//showing and hiding input by temp type 
	if( $rootScope.selectedTemplateType == 1 )
	{
		$(".forSouMde").hide();
		$(".forMouMde").show();
		$(".contentPart").css("height", "620px");
	}
	else if( $rootScope.selectedTemplateType == 2 )
	{
		$(".forSouMde").show();
		$(".forMouMde").hide();
		$(".contentPart").css("height", "500px");
	}
	else
	{
		window.location.assign("#home");
	}
		
	
	
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
		
		//pool
		$("#templateProgress").html("Retrieving the pool of mappings...");
		ExcelMappingService.get('Excel-import-app-pool').then(function(pool){
			if(!jQuery.isEmptyObject(pool))
				$scope.commonPool = pool;
			else
				$scope.commonPool = { pool : [] };
			
			console.log( $scope.commonPool );
		
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

					$scope.getDataSetInfo();
					$scope.generateEnglishAddresses();
				}).
				fail(function(jqXHR, textStatus, errorThrown){
					$("#templateProgress").html("Failed to fetch data sets ( " + errorThrown + " )");
				});
			}).
			fail(function(jqXHR, textStatus, errorThrown){
				$("#templateProgress").html("Failed to fetch organisation unit groups ( " + errorThrown + " )");
			});
		});
	});
	//**************************************************************************************************************
	
	$scope.continueAdd = function(){
		if( $scope.validateTempAdd() )
		{
			//Getting all data from template into array
			$scope.tempCells = [];
			resultArray[2].forEach(function(r){
				var cell ={};
				cell.address = r.split("=")[0];
				
				if( r.split("=").length > 1 )
					cell.value = r.split("=")[1].slice(1).trim(); //There is an addition char in the value
				
				$scope.tempCells.push(cell);
			});
			
			//getting max id
			var maxid = 0;
			$scope.templates.templates.forEach(function(t){
				if( !jQuery.isEmptyObject(t) )
				{
					if( t.id > maxid )
						maxid = t.id;
				}
			});
			
			$scope.newTemplate.id = maxid + 1;
			$scope.newTemplate.name = $("#tempName").val();
			$scope.newTemplate.typeId = $rootScope.selectedTemplateType;
			$scope.newTemplate.type = $rootScope.selectedTemplateType == "1" ? "Multiple OU - Multiple DE" : "Single OU - Multiple DE";
			$scope.newTemplate.orgUnitGroup = $rootScope.selectedOrgGroup;
			$scope.newTemplate.dataSet = $rootScope.selectedDataSet;		
			
			
			$scope.newTemplate.DEMappings = [];
			
			if( $rootScope.selectedTemplateType == 1 )
			{
				$scope.newTemplate.rowMetaData = $("#rowData").val();
				$scope.newTemplate.columnMetaData = $("#rowData").val() == "d" ? "o" : "d"; // d : DE , o: org unit
				$scope.newTemplate.rowStart = {};
				$scope.newTemplate.rowStart.rn = parseInt($("#rowStartRNum").val());
				$scope.newTemplate.rowStart.cn = parseInt($("#rowStartCNum").val());
				
				$scope.newTemplate.rowEnd = {};
				$scope.newTemplate.rowEnd.rn = parseInt($("#rowEndRNum").val());
				$scope.newTemplate.rowEnd.cn = parseInt($("#rowEndCNum").val());
				
				$scope.newTemplate.columnStart = {};
				$scope.newTemplate.columnStart.rn = parseInt($("#columnStartRNum").val());
				$scope.newTemplate.columnStart.cn = parseInt($("#columnStartCNum").val());
				
				$scope.newTemplate.columnEnd = {};
				$scope.newTemplate.columnEnd.rn = parseInt($("#columnEndRNum").val());
				$scope.newTemplate.columnEnd.cn = parseInt($("#columnEndCNum").val());
				$scope.showMappingFormFor_MOU_MDE(); //Multiple De Multiple OU
			}
			else
			{
				$scope.newTemplate.dataStart = {};
				$scope.newTemplate.dataStart.rn = parseInt($("#dStartCellRow").val());
				$scope.newTemplate.dataStart.cn = parseInt($("#dStartCellCol").val());
				
				$scope.newTemplate.dataEnd = {};
				$scope.newTemplate.dataEnd.rn = parseInt($("#dEndCellRow").val());
				$scope.newTemplate.dataEnd.cn = parseInt($("#dEndCellCol").val());
				
				$scope.newTemplate.orgUnitCell = {};
				$scope.newTemplate.orgUnitCell.rn = parseInt($("#orgCellRow").val());
				$scope.newTemplate.orgUnitCell.cn = parseInt($("#orgCellCol").val());
				$scope.showMappingFormFor_SOU_MDE(); // special
			}
		}
	};

	$scope.showMappingFormFor_SOU_MDE = function(){		
		$("#loader").fadeIn();
		$("#templateProgress").html("");
		$("#mapElements").fadeIn();	
		$("#tableContent").html("");
		
		var htmlString = "<tr><th>Cell Address </th><th> Respective Data Element - COC combination</th></tr>";
		
		var s = parseInt($scope.newTemplate.dataStart.rn);
		var f = parseInt($scope.newTemplate.dataEnd.rn);
		var cs = parseInt($scope.newTemplate.dataStart.cn);
		var cf = parseInt($scope.newTemplate.dataEnd.cn);
		
		for( var x = s ; x <= f ; x++ )
		{
			for( var y = cs ; y <= cf ; y++ )
			{
				htmlString += "<tr>";
				//var lbl = $scope.getData(x, y);
				var lbl = $scope.engAddress[y] + "" + x;
				htmlString += "<td style='padding:2px 5px'>" + lbl + "</td>";
				htmlString += "<td><select class='form-control' id='row_"+ x + "_" + y +"'><option value='-1'>--Select--</option>";
				
				$scope.selectedDataSetInfo.dataElements.forEach(function(de){
					de.categoryCombo.categoryOptionCombos.forEach(function(coc){
						var sel = $scope.isSelected( lbl, de.id + "-" + coc.id ) ? "selected" : "";
						htmlString += "<option value='" + de.id + "-" + coc.id + "' "+ sel +">" + de.name + " - " + coc.name + " </option>";
					});
				});
				
				htmlString +="</select></td>";
				htmlString += "</tr>";
			}
		}
		
		$("#tableContent").html(htmlString);
		$("#coverLoad").fadeOut();
	};
	
	//multiple OU DE
	$scope.showMappingFormFor_MOU_MDE = function(){		
		$("#loader").fadeIn();
		$("#templateProgress").html("");
		$("#mapElements").fadeIn();
		$("#tableContent").html("");
		
		var htmlString = "<tr><th>Label </th><th> Respective Data Element - COC combination</th></tr>";

		if( $scope.newTemplate.rowMetaData == "d")
		{
			var s = parseInt($scope.newTemplate.rowStart.rn);
			var f = parseInt($scope.newTemplate.rowEnd.rn);
		
			for( var x = s ; x <= f ; x++ )
			{
				htmlString += "<tr>";
				var lbl = $scope.getData(x, $scope.newTemplate.rowStart.cn);
				htmlString += "<td style='padding:2px 5px'>" + lbl + "</td>";
				htmlString += "<td><select class='form-control' id='row_"+ x + "_" + $scope.newTemplate.rowStart.cn +"'><option value='-1'>--Select--</option>";
			
				$scope.selectedDataSetInfo.dataElements.forEach(function(de){
					de.categoryCombo.categoryOptionCombos.forEach(function(coc){
						var sel = $scope.isSelected( lbl, de.id + "-" + coc.id ) ? "selected" : "";
						htmlString += "<option value='" + de.id + "-" + coc.id + "' "+ sel +">" + de.name + " - " + coc.name + " </option>";
					});
				});
			
				htmlString +="</select></td>";
				htmlString += "</tr>";
			}
		}
		else
		{
			var s = parseInt($scope.newTemplate.columnStart.cn);
			var f = parseInt($scope.newTemplate.columnEnd.cn);
		
			for( var x = s ; x <= f ; x++ )
			{
				htmlString += "<tr>";
				var lbl = $scope.getData( $scope.newTemplate.columnStart.rn , x );
				htmlString += "<td style='padding:2px 5px'>" + lbl + "</td>";
				htmlString += "<td><select class='form-control' id='row_"+ $scope.newTemplate.columnStart.rn + "_" + x +"'><option value='-1'>--Select--</option>";
			
				$scope.selectedDataSetInfo.dataElements.forEach(function(de){
					de.categoryCombo.categoryOptionCombos.forEach(function(coc){
						var sel = $scope.isSelected( lbl, de.id + "-" + coc.id ) ? "selected" : "";
						htmlString += "<option value='" + de.id + "-" + coc.id + "' "+ sel +">" + de.name + " - " + coc.name + " </option>";
					});
				});
			
				htmlString +="</select></td>";
				htmlString += "</tr>";
			}
		}
		
		$("#tableContent").html(htmlString);
		$("#coverLoad").fadeOut();
	};
	
	$scope.saveTemplate = function(){
		
		if( $rootScope.selectedTemplateType == 1 )
		{
			var s = parseInt($scope.newTemplate.rowStart.rn);
			var f = parseInt($scope.newTemplate.rowEnd.rn);
			var cs = parseInt($scope.newTemplate.columnStart.cn);
			var cf = parseInt($scope.newTemplate.columnEnd.cn);
		
			if( $scope.newTemplate.rowMetaData == "d" )
			{
				for( var x = s ; x <= f ; x++ )
				{
					var newMapping = {};
					newMapping.rowNumber = x;
					newMapping.label = $scope.getData( x, $scope.newTemplate.rowStart.cn);
					var ca = "row_" + x + "_" + $scope.newTemplate.rowStart.cn;
					newMapping.metadata = $("#" + ca ).val();
					
					if($("#" + ca ).val() != "-1" )
					{
						$scope.addPool( newMapping.label , newMapping.metadata );
						$scope.newTemplate.DEMappings.push(newMapping);
					}
				}
			}
			else
			{
				for( var x = cs ; x <= cf ; x++ )
				{
					var newMapping = {};
					newMapping.colNumber = x;
					newMapping.label = $scope.getData( $scope.newTemplate.columnStart.rn , x );
					//var ca = "col_" + $scope.newTemplate.columnStart.rn + "_"  + x ;
                    var ca = "row_" + $scope.newTemplate.columnStart.rn + "_"  + x ;
					newMapping.metadata = $("#" + ca ).val();
					
					if($("#" + ca ).val() != "-1" )
					{
						$scope.newTemplate.DEMappings.push(newMapping);
						$scope.addPool( newMapping.label , newMapping.metadata );
					}
						
				}
			}
		}
		else
		{
			var s = parseInt($scope.newTemplate.dataStart.rn);
			var f = parseInt($scope.newTemplate.dataEnd.rn);
			var cs = parseInt($scope.newTemplate.dataStart.cn);
			var cf = parseInt($scope.newTemplate.dataEnd.cn);
		
			for( var x = s ; x <= f ; x++ )
			{
				for( var y = cs ; y <= cf ; y++ )
				{
					var newMapping = {};
					newMapping.cellAddress = $scope.engAddress[y] + "" + x;
					newMapping.label = $scope.getData( x, $scope.newTemplate.dataStart.cn);
					var ca = "row_" + x + "_" + y;
					newMapping.metadata = $("#" + ca ).val();
					
					if($("#" + ca ).val() != "-1" )
					{
						$scope.addPool( newMapping.label , newMapping.metadata );
						$scope.newTemplate.DEMappings.push(newMapping);
					}
				}
			}
		}
		
		$scope.storePool();		
		if( $scope.newTemplate.DEMappings.length == 0 )
		{
			$scope.newTemplate
			alert("Atleast one row should be mapped");
			return false;
		}
		else
		{
			$scope.templates.templates.push( $scope.newTemplate );
			$scope.storeTemp();
			return true;
		}
	};
	
	
	$scope.storeTemp = function( ){
		ExcelMappingService.save('Excel-import-app-templates',$scope.templates ).then(function(tem){
			console.log( $scope.templates );
			window.location.assign("#manage-templates");
		});	
	};
	
	$scope.storePool = function(){
		ExcelMappingService.save('Excel-import-app-pool',$scope.commonPool ).then(function(r){
			//console.log(r);
		});
	};
	
	$scope.isSelected = function( cLabel , cMetaData ){
		var isSel = false;
		$scope.commonPool.pool.forEach( function(p){
			if( p.key == cLabel && p.value == cMetaData )
				isSel = true;
		});
		return isSel;
	};
	
	$scope.getData = function( rowNum, colNum ){
		var address = $scope.engAddress[colNum]+""+rowNum;
		var val = "";
		
		$scope.tempCells.forEach(function(c){
			if( c.address == address )
				val = c.value;
		});
		return(val);
	};
	
	//add pool elements
	$scope.addPool = function( key , value ){
		var isNew = true;
		$scope.commonPool.pool.forEach(function(p){
			if( p.key == key )
			{
				p.value = value;
				isNew = false;
			}
		});
		
		if( isNew )
		{
			var newPoolElement = {};
			newPoolElement.key = key;
			newPoolElement.value = value;
			$scope.commonPool.pool.push( newPoolElement );
		}
	};
	
	$scope.validateTempAdd = function(){
		$(".form-control").css("background","#fff");
		var isValidated = true;
		
		if($("#tempName").val() == "")
		{
			$("#tempName").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#rowStartRNum").val() == "")
		{
			$("#rowStartRNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#rowStartCNum").val() == "")
		{
			$("#rowStartCNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#rowEndRNum").val() == "")
		{
			$("#rowEndRNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#rowEndCNum").val() == "")
		{
			$("#rowEndCNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#columnStartRNum").val() == "")
		{
			$("#columnStartRNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#columnStartCNum").val() == "")
		{
			$("#columnStartCNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#columnEndRNum").val() == "")
		{
			$("#columnEndRNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#columnEndCNum").val() == "")
		{
			$("#columnEndCNum").css("background","#FF9999");	
			isValidated = false;
		}
		
		if($("#tempImport").val() == "")
		{
			$("#tempImport").css("background","#FF9999");	
			isValidated = false;
		}
		
		return true;
		//return isValidated;
	};
	
	$scope.isSelected = function( cLabel , cMetaData ){
		var isSel = false;
		
		$scope.commonPool.pool.forEach( function(p){
			if( p.key == cLabel && p.value == cMetaData )
				isSel = true;
		});
		
		return isSel;
	};

	$scope.generateEnglishAddresses = function(){
		//generating more address notations for columns
		for( var x = 1 ; x < 27 ; x++ )
		{
			for( var y = 1 ; y < 27 ; y++ )
			{
				$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]);
			}
		}
		
		for( var x = 1 ; x < 27 ; x++ )
		{
			for( var y = 1 ; y < 27 ; y++ )
			{			
				for( var z = 1; z < 27 ; z++ )
				{
					$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]+ "" + $scope.engAddress[z]);
				}
			}
		}
		
		for( var x = 1 ; x < 27 ; x++ )
		{
			for( var y = 1 ; y < 27 ; y++ )
			{			
				for( var z = 1; z < 27 ; z++ )
				{
					for( var u = 1; u < 27 ; u++ )
					{
						$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]+ "" + $scope.engAddress[z]+ "" + $scope.engAddress[u]);					
					}
				}
			}
		}
	};
	
	$scope.getDataSetInfo = function(){
		$("#templateProgress").html("Getting selected dataset info...");
		var url = "../api/dataSets/"+ $rootScope.selectedDataSet +".json?fields=id,organisationUnits[id],dataElements[id,name,shortName,categoryCombo[categoryOptionCombos[id,name]]]&paging=false";
		$.get(url , function(ds){
			$scope.selectedDataSetInfo = ds;
			
			var s = $scope.selectedDataSetInfo.dataElements.length;
			
			for( var x = 0; x < s ; x++ )
			{
				for( var y =0 ; y < s - 1 ; y++ )
				{
					var t = {};
					if( $scope.selectedDataSetInfo.dataElements[y].name > $scope.selectedDataSetInfo.dataElements[y+1].name)
					{
						t = $scope.selectedDataSetInfo.dataElements[y];
						$scope.selectedDataSetInfo.dataElements[y] = $scope.selectedDataSetInfo.dataElements[y+1] ;
						$scope.selectedDataSetInfo.dataElements[y+1] = t;
					}
				}
			}
			
			$("#loader").hide();
		}).
		fail(function(jqXHR, textStatus, errorThrown){
			$("#templateProgress").html("Failed to load selected dataset info ( " + errorThrown + " )");
		});
	};
});