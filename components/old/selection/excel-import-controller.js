/* global excelUpload, angular */

//Controller for excel importing
excelUpload.controller('ExcelImportController',
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
    
    $scope.selected = {};
    $scope.templates = {};
	$scope.commonPool = {};
	$scope.history = {};
    $scope.dataSets = [];
    $scope.organisationUnits = [];
    $scope.selectedDataSetInfo = {};
	$scope.selectedOuChildren = {};
	$scope.currentAction = 0; // 1 for managing templates , 2 for data import, 3 for settings
	
	//uploaded template cells
	$scope.tempCells = [];
	
	//data cells
	$scope.dataCells = [];
	
	$scope.engAddress = ["","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];		
	
    $("#orgUnitTree").addClass("disable-clicks");
	
	/* **************************************************************************************
	**** RETRIEVING ROOT JSON AND NEEDED DATA ***********************************************
	************************************************************************************* **/
	
    MetaDataFactory.getAll('dataSets').then(function(dss){
        $scope.dataSets = dss;
		
		$.get('../api/organisationUnits.json?paging=false&fields=name,id', function(ou){
			$scope.organisationUnits = ou.organisationUnits;
		
			ExcelMappingService.get('Excel-import-app-templates').then(function(tem){
				$scope.templates = jQuery.isEmptyObject( tem ) ? JSON.parse('{"templates" : []}') : tem;
				
				ExcelMappingService.get('Excel-import-app-history').then(function(his){
					$scope.history = jQuery.isEmptyObject( his ) ? JSON.parse('{"history" : []}') : his;
					
					ExcelMappingService.get('Excel-import-app-pool').then(function(pool){
						$scope.commonPool = jQuery.isEmptyObject( pool ) ? JSON.parse('{"pool" : []}') : pool;
						console.log($scope.templates);
						console.log($scope.commonPool);
						console.log($scope.history);
						$("#loader").hide();
					});
				});
			});
		});
    });
    
    if($scope.selected.dataSet){
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
    }	
 
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

	/** **************************************************************************************************************
	******************************************************************************************************************
	*************************************************************************************************************** **/
	
	/* **************************************************************************************
	**** MANAGING TEMPLATES - FUNCTIONS *****************************************************
	************************************************************************************* **/
	$scope.newTemplate = {};
	
	$scope.manageTemplateAction = function(){
		$scope.currentAction = 1;
		$("#dataSetId").prop('selectedIndex',0);
		$("#settingsDiv").fadeOut();
		$("#dataImportDiv").fadeOut();
		$("#manageTempDiv").fadeIn();
		$("#templatesDiv").addClass('disabled');

		if($("#dataSetId").val())
			$scope.validateSelection();
	};
	
	$scope.addTemplate = function(opt){
		if( opt == 0 )
		{
			$(".am").val("");
			$(".am").css("background","#fff");
			$scope.isbacked = 0;			
		}
		
		$(".ml").hide();
		$('#addTemplateModal').show();
		$("#loader").fadeIn();
	};
	
	$scope.deleteTemp = function(){
		var deletedIndex = -1;		
		
		$scope.templates.templates.forEach(function(te,index){
			if(te.id == $("#templateSel").val())
			{
				deletedIndex = index;
			}
		});
		
		if( deletedIndex >= 0)
			$scope.templates.templates.splice( deletedIndex , 1 );
		
		$scope.storeTemp("delete");
		$scope.validateSelection();
	};
	
	$scope.viewTemp = function(){
		var selectedTemp = "";		
		
		$scope.templates.templates.forEach(function(te,index){
			if(te.id == $("#templateSel").val())
			{
				selectedTemp = te;
			}
		});
		
		if( selectedTemp != "")
		{
			//printing template sample
			$(".ml").hide();
			$("#viewSavedTempModal").fadeIn();
			$("#coverLoadT").fadeIn();
			var htmlString = "";
			
			htmlString += "<tr><td style='max-width:50px;min-width:50px;padding:2px 5px'></td>";
			for( var x = selectedTemp.rowStart.cn ; x <= selectedTemp.columnEnd.cn ; x++ )
			{
				htmlString += "<td style='max-width:200px;min-width:150px;padding:2px 5px;background:#ddd'>" + $scope.engAddress[x] + "</td>";
			}
			htmlString += "</tr>";
			
			var mapVal = [];
			
			selectedTemp.rowMappings.forEach(function(rm){
				var v = {};
				v.col = selectedTemp.rowStart.cn;
				v.row = rm.rowNumber;
				v.label = rm.label;
				mapVal.push(v);
			});
			
			selectedTemp.columnMappings.forEach(function(cm){
				var v = {};
				v.row = selectedTemp.columnStart.rn;
				v.col = cm.colNumber;
				v.label = cm.label;
				mapVal.push(v);
			});
					
			for( var y = selectedTemp.columnStart.rn ; y <= selectedTemp.rowEnd.rn ; y++ )
			{
				htmlString += "<tr>";
				htmlString += "<td style='max-width:50px;min-width:50px;padding:2px 5px;background:#ddd'>" + y + "</td>";
				
				for( var x = selectedTemp.rowStart.cn ; x <= selectedTemp.columnEnd.cn ; x++ )
				{
					var val = "";
					
					mapVal.forEach(function(m){
						if( m.row == y && m.col == x )
							val = m.label;
					});
					
					htmlString += "<td style='max-width:200px;min-width:150px;padding:2px 5px'>" + val + "</td>";
				}
				htmlString += "</tr>";
			}
			
			$("#tableContentT").html(htmlString);
			$("#coverLoadT").fadeOut();
		}
	};
	
	$scope.hideModal = function() {
		$("#viewSavedTempModal").fadeOut();
		$("#loader").fadeOut();
	};
	
	$scope.validateSelection = function(){
		if( $("#tempOrgUnit").val() != "" && $("#dataSetId").val() != "" )
		{
			$scope.getDataSetInfo($("#dataSetId").val());
			$scope.getOrgUnitInfo($("#tempOrgUnit").attr("ref"));
			
			var noTemplatesFound = true;
			$('#templateSel').html("");
			$scope.templates.templates.forEach(function(te){
				if( te.dataSet == $("#dataSetId").val() && te.rootOrgUnit == $("#tempOrgUnit").attr("ref") )
				{	
					noTemplatesFound = false;
					$('#templateSel').append($('<option>', {
						value: te.id,
						text: te.name
					}));
				}
			});
		
			if( noTemplatesFound )
			{
				$('#templateSel').append($('<option>', {
					value: -1,
					text: "No templates found. Add one."
				}));
				
				$("#editTem").attr("disabled","disabled");
				$("#delTem").attr("disabled","disabled");
			}
			else
			{
				$("#editTem").removeAttr("disabled");
				$("#delTem").removeAttr("disabled");
			}
				
			$("#templatesDiv").removeClass('disabled');			
		}
		else
		{
			$('#templateSel').html("");
			
			$('#templateSel').append($('<option>', {
				value: -1,
				text: "Select an Organisation Unit and a Dataset"
			}));
			
			$("#templatesDiv").addClass('disabled');		
		}
	};
				
	$scope.saveTemplate = function(){
		if( $scope.validateTempAdd())
		{
			$(".ml").hide();
			$("#addTemplateModal").fadeOut();
			$("#hd1").html("Template Layout");
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
				if( t.id > maxid )
					maxid = t.id;
			});
			
			$scope.newTemplate.id = maxid + 1;
			$scope.newTemplate.name = $("#tempName").val();
			$scope.newTemplate.rootOrgUnit = $("#tempOrgUnit").attr("ref");
			$scope.newTemplate.dataSet = $("#dataSetId").val();
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
			$scope.newTemplate.rowMappings = [];
			$scope.newTemplate.columnMappings = [];
			
			//printing template sample
			$("#viewTempModal").fadeIn();
			$("#loader").fadeIn();
			var htmlString = "";
			
			htmlString += "<tr><td style='max-width:50px;min-width:50px;padding:2px 5px'></td>";

			for( var x = $scope.newTemplate.rowStart.cn ; x <=$scope.newTemplate.columnEnd.cn  ; x++ )
			{
				htmlString += "<td style='max-width:200px;min-width:150px;padding:2px 5px;background:#ddd'>" + $scope.engAddress[x] + "</td>";
			}
			htmlString += "</tr>";
			
			for( var y = $scope.newTemplate.columnStart.rn ; y <= $scope.newTemplate.rowEnd.rn ; y++ )
			{
				htmlString += "<tr>";
				htmlString += "<td style='max-width:50px;min-width:50px;padding:2px 5px;background:#ddd'>" + y + "</td>";
				
				for( var x = $scope.newTemplate.rowStart.cn ; x <= $scope.newTemplate.columnEnd.cn ; x++ )
				{
					var bg = "#fff";
					
					if( x >= $scope.newTemplate.columnStart.cn && y == $scope.newTemplate.columnStart.rn)
						bg = "#FFCC99";
					else if( y >= $scope.newTemplate.rowStart.rn && x == $scope.newTemplate.rowStart.cn)
						bg = "#CCFFCC";
						
					htmlString += "<td style='max-width:200px;min-width:150px;padding:2px 5px;background:"+ bg +"'>" + $scope.getData(y,x) + "</td>";
				}
				htmlString += "</tr>";
			}
			
			//console.log( htmlString );
			$("#tableContentV").html(htmlString);
			$("#coverLoadV").fadeOut();
			$("#addTemplateModal").modal('hide');
		}
	};
	
	$scope.cancelOperation = function(id){
		$("#loader").hide();
		$(".ml").hide();
		$("#"+id).hide();
	};
	//Show mappings ------------------------------------------------------------------------------------------------------
	//row
	$scope.showRowMapping = function(){
			var md = $("#rowData").val() == "o" ? "Organisation Units" : "Data Elements";
			$("#hd2").html("Map " + md );
			$(".ml").hide();
			$("#viewTempModal").fadeOut();	
			$("#rowMappingModal").fadeIn();			
			$("#coverLoadR").fadeIn();		
			$("#tableContentC").html("");
			
			var htmlString = "";
			
			var s = parseInt($scope.newTemplate.rowStart.rn);
			var f = parseInt($scope.newTemplate.rowEnd.rn);
			
			for( var x = s ; x <= f ; x++ )
			{
				htmlString += "<tr>";
				var lbl = $scope.getData(x, $scope.newTemplate.rowStart.cn);
				htmlString += "<td style='padding:2px 5px'>" + lbl + "</td>";
				htmlString += "<td><select class='form-control' id='row_"+ x + "_" + $scope.newTemplate.rowStart.cn +"'><option value='-1'>--Select--</option>";
				
				if( $("#rowData").val() == "o")
				{
					$scope.selectedOuChildren.children.forEach(function(c){
						var isFound = false;
						
						$scope.selectedDataSetInfo.organisationUnits.forEach(function(o){
							if( c.uid == o.id )
								isFound = true;
						});
						
						if( isFound )
						{
							var sel = $scope.isSelected( lbl, c.uid ) ? "selected" : "";
							htmlString += "<option value='" + c.uid + "' " + sel +">" + c.name +"</option>";							
						}
					});					
				}
				else
				{
					$scope.selectedDataSetInfo.dataElements.forEach(function(de){
						de.categoryCombo.categoryOptionCombos.forEach(function(coc){
							var sel = $scope.isSelected( lbl, de.id + "-" + coc.id ) ? "selected" : "";
							htmlString += "<option value='" + de.id + "-" + coc.id + "' "+ sel +">" + de.name + " - " + coc.name + " </option>";
						});
					});
				}
				
				htmlString +="</select></td>";
				htmlString += "</tr>";
			}
			
			$("#tableContentR").html(htmlString);
			$("#coverLoadR").fadeOut();
	};
	
	//column 
	$scope.showColumnMapping = function(){
		if($scope.saveRowMapping())
		{
			var md = $("#rowData").val() == "d" ? "Organisation Units" : "Data Elements";
			$("#headTitle").html("Map " + md );
			$(".ml").hide();
			$("#rowMappingModal").fadeOut();
			$("#colMappingModal").fadeIn();					
			$("#tableContentC").html("");
			
			var htmlString = "";
			
			var s = parseInt($scope.newTemplate.columnStart.cn);
			var f = parseInt($scope.newTemplate.columnEnd.cn);
			
			for( var x = s ; x <= f ; x++ )
			{
				htmlString += "<tr>";
				var lbl = $scope.getData( $scope.newTemplate.columnStart.rn , x );
				htmlString += "<td style='padding:2px 5px'>" + lbl + "</td>";
				htmlString += "<td><select class='form-control' id='col_"+ $scope.newTemplate.columnStart.rn + "_" + x + "'><option value='-1'>--Select--</option>";
				
				if( $("#rowData").val() == "d")
				{
					$scope.selectedOuChildren.forEach(function(c){
						
						var isFound = false;
					
						$scope.selectedDataSetInfo.organisationUnits.forEach(function(o){
							if( c.uid == o.id )
								isFound = true;
						});
						
						if( isFound )
						{
							var sel = $scope.isSelected( lbl, c.uid ) ? "selected" : "";
							htmlString += "<option value='" + c.uid + "' " + sel +">" + c.name +"</option>";							
						}
					});					
				}
				else
				{
					$scope.selectedDataSetInfo.dataElements.forEach(function(de){
						de.categoryCombo.categoryOptionCombos.forEach(function(coc){
							var sel = $scope.isSelected( lbl, de.id + "-" + coc.id ) ? "selected" : "";
							htmlString += "<option value='" + de.id + "-" + coc.id + "' "+ sel +">" + de.name + " - " + coc.name + " </option>";
						});
					});
				}
				
				htmlString +="</select></td>";
				htmlString += "</tr>";
			}
			
			$("#tableContentC").html(htmlString);
			$("#coverLoadC").fadeOut();			
		}
	};
	
	// Save mappings
	//*****************************************************************************************************************
	$scope.saveAll = function(){
		if( $scope.saveColumnMapping())
		{
			$scope.templates.templates.push($scope.newTemplate);
			$scope.storeTemp("add");					
		}
	};
	
	$scope.storeTemp = function( act ){
		ExcelMappingService.save('Excel-import-app-templates',$scope.templates ).then(function(tem){
			if( act =="add")
			{
				location.reload();
			}
		});	
	};
	
	$scope.storePool = function(){
		ExcelMappingService.save('Excel-import-app-pool',$scope.commonPool ).then(function(r){
			//console.log(r);
		});
	};
	
	$scope.storeHistory = function(){
		ExcelMappingService.save('Excel-import-app-history',$scope.history ).then(function(r){
			//console.log(r);
		});
	};
	
	$scope.saveColumnMapping = function(){
		var s = parseInt($scope.newTemplate.columnStart.cn);
		var f = parseInt($scope.newTemplate.columnEnd.cn);
		
		$scope.newTemplate.columnMappings = [];
		
		for( var x = s ; x <= f ; x++ )
		{
			var newMapping = {};
			newMapping.colNumber = x;
			newMapping.label = $scope.getData( $scope.newTemplate.columnStart.rn , x );
			var ca = "col_" + $scope.newTemplate.columnStart.rn + "_"  + x ;
			newMapping.metadata = $("#" + ca ).val();
			
			if($("#" + ca ).val() != "-1" )
			{
				$scope.newTemplate.columnMappings.push(newMapping);
				$scope.addPool( newMapping.label , newMapping.metadata );
			}
				
		}
		
		$scope.storePool();
		
		if( $scope.newTemplate.columnMappings.length == 0 )
		{
			alert("Atleast one column should be mapped");
			return false;
		}
		else
			return true;
	};
	
	$scope.saveRowMapping = function(){
		var s = parseInt($scope.newTemplate.rowStart.rn);
		var f = parseInt($scope.newTemplate.rowEnd.rn);
		
		$scope.newTemplate.rowMappings = [];
		
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
				$scope.newTemplate.rowMappings.push(newMapping);
			}
				
		}
		
		$scope.storePool();
		
		if( $scope.newTemplate.rowMappings.length == 0 )
		{
			alert("Atleast one row should be mapped");
			return false;
		}
		else
			return true;
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
		
		/*
		$scope.templates.templates.forEach(function(t){
			t.rowMappings.forEach(function(r){
				if( r.label == cLabel && r.metadata == cMetaData )
					isSel = true;
			});
			
			t.columnMappings.forEach(function(c){
				if( c.label == cLabel && c.metadata == cMetaData )
					isSel = true;
			});
		}); */
		
		$scope.commonPool.pool.forEach( function(p){
			if( p.key == cLabel && p.value == cMetaData )
				isSel = true;
		});
		
		return isSel;
	};
	// get selected dataset info ------------------------------------------------------------------------------------------------------
	
	$scope.getDataSetInfo = function(id){
		var url = "../api/dataSets/"+ id +".json?fields=id,organisationUnits[id],dataElements[id,name,shortName,categoryCombo[categoryOptionCombos[id,name]]]&paging=false";
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
			
			//console.log( $scope.selectedDataSetInfo.dataElements );
		});
	};
	
	// get selected orgunit children ------------------------------------------------------------------------------------------------------
	
	$scope.getOrgUnitInfo = function(id){
		var url = "../api/organisationUnits/"+ id +".json?fields=id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level]]]]]";
		$.get(url , function(data){			
			$scope.allOrgUnitChildren = [];
			
			$scope.totalOrgLevels = 1;
			
			//level 2
			data.children.forEach(function(o){
				var orgUnit = {};
				orgUnit.uid = o.id; orgUnit.name = o.name, orgUnit.level = o.level;				
				$scope.allOrgUnitChildren.push(orgUnit);
				
				if( $scope.totalOrgLevels < 2 )
					$scope.totalOrgLevels = 2;
				
				//level3
				o.children.forEach(function(a){
					var orgUnit2 = {};
					orgUnit2.uid = a.id; orgUnit2.name = a.name, orgUnit2.level = a.level;
					$scope.allOrgUnitChildren.push(orgUnit2);
					
					if( $scope.totalOrgLevels < 3 )
						$scope.totalOrgLevels = 3;				
					
					//level4
					a.children.forEach(function(b){
						var orgUnit3 = {};
						orgUnit3.uid = b.id; orgUnit3.name = b.name, orgUnit3.level = b.level;
						$scope.allOrgUnitChildren.push(orgUnit3);
					
						if( $scope.totalOrgLevels < 4 )
							$scope.totalOrgLevels = 4;
				
						//level5
						b.children.forEach(function(c){
							var orgUnit4 = {};
							orgUnit4.uid = c.id; orgUnit4.name = c.name, orgUnit4.level = c.level;
							$scope.allOrgUnitChildren.push(orgUnit4);
					
							if( $scope.totalOrgLevels < 5 )
								$scope.totalOrgLevels = 5;
				
							//level6
							c.children.forEach(function(d){
								var orgUnit5 = {};
								orgUnit5.uid = d.id; orgUnit5.name = d.name, orgUnit5.level = d.level;
								$scope.allOrgUnitChildren.push(orgUnit5);
						
								if( $scope.totalOrgLevels < 6 )
									$scope.totalOrgLevels = 6;
				
								//level7
								d.children.forEach(function(e){
									var orgUnit6 = {};
									orgUnit6.uid = e.id; orgUnit6.name = e.name, orgUnit6.level = e.level;
									$scope.allOrgUnitChildren.push(orgUnit6);
														
									if( $scope.totalOrgLevels < 7 )
										$scope.totalOrgLevels = 7;				
				
									//level8
									e.children.forEach(function(f){
										var orgUnit7 = {};
										orgUnit7.uid = f.id; orgUnit7.name = f.name, orgUnit7.level = f.level;
										$scope.allOrgUnitChildren.push(orgUnit7);								
								
										if( $scope.totalOrgLevels < 8 )
											$scope.totalOrgLevels = 8;
				
									});
								});
							});
						});
					});
				});
			});
			
			var s = $scope.allOrgUnitChildren.length;
			
			for( var x = 0; x < s ; x++ )
			{
				for( var y =0 ; y < s - 1 ; y++ )
				{
					var t = {};
					if( $scope.allOrgUnitChildren[y].name > $scope.allOrgUnitChildren[y+1].name)
					{
						t = $scope.allOrgUnitChildren[y];
						$scope.allOrgUnitChildren[y] = $scope.allOrgUnitChildren[y+1] ;
						$scope.allOrgUnitChildren[y+1] = t;
					}
				}
			}
			$scope.selectedOuChildren = $scope.allOrgUnitChildren;
		});
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
	/** **************************************************************************************************************
	******************************************************************************************************************
	*************************************************************************************************************** **/
	
	/* **************************************************************************************
	**** DATA IMPORT - FUNCTIONS ************************************************************
	************************************************************************************* **/
	
	$scope.dataImportAction = function(){	
		$scope.currentAction = 2;
		$("#manageTempDiv").fadeOut();
		$("#settingsDiv").fadeOut();
		$("#dataImportDiv").fadeIn();
		$("#imDiv").addClass('disabled');
		$("#importPeriod").addClass('disabled');
		if($("#importDataSetId").val())
			$scope.generatePeriods();
	};
	
	$scope.generatePeriods = function(){
		if( $("#importDataSetId").val() != "" && $("#importOrgUnit").attr("ref") != "" )
		{
			var url = "../api/dataSets/" + $("#importDataSetId").val() + ".json?fields=periodType";
			$.get(url, function(d){
				
				//printing periods ------------------
				var periodType = d.periodType;	
				var today = new Date();
				var stDate = "01/01/" + today.getFullYear();
				var endDate = "01/01/" + (today.getFullYear()+1);
				
				var periods = "";
				
				if(periodType == "Daily")
					periods = daily( stDate , endDate );
				else if(periodType == "Weekly")
					periods = weekly( stDate , endDate );
				else if(periodType == "Monthly")
					periods = monthly( stDate , endDate );
				else if(periodType == "Yearly")
					periods = yearly( stDate , endDate );
				
				$("#importPeriod").html("");
				periods.split(";").forEach(function(p){
					var ps = periodType == 'Monthly' ? $scope.monthString(p) : p;
					var h = "<option value='"+ p +"'>" + ps + "</option>";
					$("#importPeriod").append(h);
				});
				
				//prining templates ---------------------
				var noTemplatesFound = true;
				$('#importTemp').html("");
				$scope.templates.templates.forEach(function(te){
					if( te.dataSet == $("#importDataSetId").val() && te.rootOrgUnit == $("#importOrgUnit").attr("ref") )
					{	
						noTemplatesFound = false;
						$('#importTemp').append($('<option>', {
							value: te.id,
							text: te.name
						}));
					}
				});
			
				if( noTemplatesFound )
				{
					$('#importTemp').append($('<option>', {
						value: -1,
						text: "No templates found. Add one."
					}));
					
					$("#imb").attr("disabled","disabled");
					$("#imc").attr("disabled","disabled");
					$("#imDiv").addClass("disabled");
				}
				else
				{
					$("#imb").removeAttr("disabled");
					$("#imc").removeAttr("disabled");
					$("#imDiv").removeClass("disabled");
				}
				
				$("#importPeriod").removeClass("disabled");
			});
			
		}
	};
	
	$scope.monthString = function(pst){
		var month = pst.substring(4, 6);
		var ms = "";
		
		if( month == "01" )
			ms = "Jan";
		else if( month == "02" )
			ms = "Feb";
		else if( month == "03" )
			ms = "Mar";
		else if( month == "04" )
			ms = "Apr";
		else if( month == "05" )
			ms = "May";
		else if( month == "06" )
			ms = "Jun";
		else if( month == "07" )
			ms = "Jul";
		else if( month == "08" )
			ms = "Aug";
		else if( month == "09" )
			ms = "Sep";
		else if( month == "10" )
			ms = "Oct";
		else if( month == "11" )
			ms = "Nov";
		else if( month == "12" )
			ms = "Dec";
		
		return ms + " " + pst.substring(0, 4);
	};
	
	$scope.importData = function(){
		if( $("#dataImport").val() == "")
		{
			$("#dataImport").css("background","#FF9999");	
		}
		else
		{
			$("#loader").show();
			//formatting data
			$scope.dataCells = [];
			resultArray[2].forEach(function(r){
				var cell ={};
				cell.address = r.split("=")[0];
				
				if( r.split("=").length > 1 )
					cell.value = r.split("=")[1].slice(1).trim(); //There is an additional char in the value
				
				$scope.dataCells.push(cell);
			});
			
			//getting template details
			var selectedTemp = {};
			$scope.templates.templates.forEach(function(t){
				if( t.id == $("#importTemp").val() )
					selectedTemp = t;
			});
			
			//preparing data values
			var dataValueSet = { };
			var dataValues = [];
			
			selectedTemp.rowMappings.forEach(function(r) {	
				selectedTemp.columnMappings.forEach(function(c) {				
					var dataValue = {};

					if( selectedTemp.rowMetaData == "d")
					{
						dataValue ["orgUnit"] = c.metadata;
						dataValue ["dataElement"] = r.metadata.split("-")[0];
						dataValue ["categoryOptionCombo"] = r.metadata.split("-")[1];
					}
					else
					{
						dataValue ["orgUnit"] = r.metadata;
						dataValue ["dataElement"] = c.metadata.split("-")[0];
						dataValue ["categoryOptionCombo"] = c.metadata.split("-")[1];
					}
					
					dataValue ["period"] = $("#importPeriod").val();
					
					var v = $scope.getImportData( r.rowNumber , c.colNumber );
					
					if( $("#importEmpty").val() == "1" )
						dataValue ["value"] =  v == "" ? "0" : v ;
					else
						dataValue ["value"] =  v;
					

					if( dataValue ["dataElement"] != ""  && dataValue ["categoryOptionCombo"] != "" && dataValue ["orgUnit"] != "")
					{
						if( !( $("#importEmpty").val() == "2" && dataValue ["value"] == "" ))
							dataValues.push( dataValue );
					}	
				});
			});
			
			//console.log( dataValues );
			dataValueSet.dataValues = dataValues;
			
			//saving data
			ExcelMappingService.importData( dataValueSet ).then(function(tem){
				$("#loader").hide();
				
				$.get("../api/system/info", function(data){
					//adding history
					var h = {};
					
					h.time = data.serverDate.split("T")[0] + " (" + data.serverDate.split("T")[1].split(".")[0] + ")";
					h.orgUnit = $scope.getOrgUnitName(selectedTemp.rootOrgUnit);
					h.dataSet = $scope.getDataSetName(selectedTemp.dataSet);
					h.template = selectedTemp.name;
					h.stats = {};
					h.stats.upc = tem.data.importCount.updated;
					h.stats.imc = tem.data.importCount.imported;
					h.stats.igc = tem.data.importCount.ignored;
					$scope.history.history.push(h);
					$scope.storeHistory();
					
					$("#upc").html(tem.data.importCount.updated);
					$("#imct").html(tem.data.importCount.imported);
					$("#igc").html(tem.data.importCount.ignored);
					$("#stModal").modal('show');
				});
			});
		}
	};
	
	$scope.finishAll = function(){
		restoreHome();
		$("#resultModal").fadeOut();
		$("#dataImport").css("background","#fff");
	};
	/** **************************************************************************************************************
	******************************************************************************************************************
	*************************************************************************************************************** **/
	
	/* **************************************************************************************
	**** HISTORY - FUNCTIONS ***************************************************************
	************************************************************************************* **/
	
	$scope.historyAction = function(){
		$scope.currentAction = 3;
		$("#manageTempDiv").fadeOut();
		$("#dataImportDiv").fadeOut();
		$("#settingsDiv").fadeIn();
	};
	
	$scope.reset = function(){
		if (confirm("Are you sure that you want to reset everything?") == true) 
		{
			$scope.templates = {};
			$scope.storeTemp("reset");
			
			$scope.history = {};
			$scope.storeHistory();
			
			$scope.commonPool = {};
			$scope.storePool();
			
			location.reload();
		}
			
	};
	
	$scope.clearHistory = function(){
		if (confirm("Are you sure that you want to clear all the history?") == true) 
		{
			$scope.history = {};
			$scope.storeHistory();
			location.reload();
		}
	};
	
	$scope.deleteTemplates = function(){
		if (confirm("Are you sure that you want to delete all the templates?") == true) 
		{
			$scope.templates = {};
			$scope.storeTemp("reset");
			location.reload();
		}
	};
	
	$scope.viewHistory = function(){
		var htmlString = "<tr>";
		htmlString += "<th> Data Set </th><th> Root Organisation Unit </th> <th> Template </th> <th> Time </th> <th>Imported</th><th>Updated</th><th>Ignored</th>";
		htmlString += "</tr>";
		
		$scope.history.history.forEach(function(h){
			htmlString += "<tr>";
			htmlString += "<td>" + h.dataSet + "</td>";
			htmlString += "<td>" + h.orgUnit + "</td>";
			htmlString += "<td>" + h.template + "</td>";
			htmlString += "<td>" + h.time + "</td>";
			htmlString += "<td>" + h.stats.imc + "</td>";
			htmlString += "<td>" + h.stats.upc + "</td>";
			htmlString += "<td>" + h.stats.igc + "</td>";
			htmlString += "</tr>";
		});
		
		$("#tableContentH").html( htmlString );
		$("#loader").show();
		$("#viewHistoryModal").fadeIn();
	};
	/** **************************************************************************************************************
	******************************************************************************************************************
	*************************************************************************************************************** **/
	
	/* **************************************************************************************
	**** COMMON FUNCTIONS *******************************************************************
	************************************************************************************* **/
	
	$scope.getData = function( rowNum, colNum ){
		var address = $scope.engAddress[colNum]+""+rowNum;
		var val = "";
		
		$scope.tempCells.forEach(function(c){
			if( c.address == address )
				val = c.value;
		});
		
		return(val);
	};
	
	$scope.getImportData = function( rowNum, colNum ){
		var address = $scope.engAddress[colNum]+""+rowNum;
		var val = "";
		
		$scope.dataCells.forEach(function(c){
			if( c.address == address )
				val = c.value;
		});
		
		return(val);
	};
	
	$scope.changeOrg = function(){
		if($scope.currentAction == 1 )
			$scope.validateSelection();
		else
			$scope.generatePeriods();
	};

	$scope.getOrgUnitName = function(uid){
		var oname = "";
		
		$scope.organisationUnits.forEach(function(o){
			if(o.id == uid )
				oname = o.name;
		});
		
		return oname;
	};
	
	$scope.getDataSetName = function(uid){
		var dname = "";
		
		$scope.dataSets.forEach(function(d){
			if(d.id == uid )
				dname = d.name;
		});
		
		return dname;
	};
});