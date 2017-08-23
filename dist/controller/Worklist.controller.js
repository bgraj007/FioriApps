sap.ui.define([
	"BillManagerWorklist/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"BillManagerWorklist/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/routing/History",
	'sap/m/MessageBox',
	'sap/m/Button',
	'sap/m/Dialog'
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, History, MessageBox, Button, Dialog) {
	"use strict";

	return BaseController.extend("BillManagerWorklist.controller.Worklist", {
		formatter: formatter,
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			this._oTable = oTable;
			// keeps the search state
			this._oTableSearchState = [];
			var f4Model = sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPRS_VALUE_HELP_SRV");
			this.getView().setModel(f4Model, "F4Model");
			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("worklistViewTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistViewTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				saveButton: false,
				saveFA: false,
				saveFE: false,
				saveASTE: false,
				saveApr: false,
				cancelDB: false,
				Comments: "",
				NewComments: "",
				billNum: ""
			});
			this.setModel(oViewModel, "worklistView");
			this.setModel(new JSONModel({
				Boffice: ""
			}), "searchModel");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},
		onPress: function(oEvent) {
			var oSelItem = oEvent.getSource();
			var oContext = oSelItem.getBindingContext();
			var oObj = oContext.getObject(),
				billerUrl;

			switch (oObj.Role) {
				case "01":
					billerUrl = "/sap/bc/ui5_ui5/sap/ZPRS_BILL_EDIT/index.html#/main/" + oObj.Vbeln;
					sap.m.URLHelper.redirect(billerUrl, true);
					break;
				case "02":
				case "03":
				case "04":
				case "05":
					billerUrl = "/sap/bc/ui5_ui5/sap/ZPRS_WORK_FLOW/index.html#/main/" + oObj.Vbeln;
					sap.m.URLHelper.redirect(billerUrl, true);
					break;
			}
		},
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				this.onRefresh();
			} else {
				var oTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					oTableSearchState = [new Filter("Pspid", FilterOperator.Contains, sQuery), new Filter("Vbeln", FilterOperator.Contains, sQuery)];
					oTableSearchState = [new Filter(oTableSearchState, false)];
				}
				this._applySearch(oTableSearchState);
			}
		},

		onRefresh: function() {
			this._oTable.getBinding("items").refresh();
		},

		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Vbeln")
			});
		},

		_applySearch: function(oTableSearchState) {
			var oViewModel = this.getModel("worklistView");
			this._oTable.getBinding("items").filter(oTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (oTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		onRequestSent: function(oEvt) {
			this.getView().setBusy(true);
		},
		showQickView: function(oEvt) {
			var src = oEvt.getSource();
			var caller = src.data().caller;
			var fragPath = "BillManagerWorklist.fragments.Comment";
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			worklistData.caller = caller;
			if (caller !== "multi") {
				var obj = src.getBindingContext().getObject();
				worklistData.NewComments = obj.NewComments;
			} else {
				worklistData.NewComments = "";
			}
			worklistModel.setData(worklistData);
			worklistModel.refresh();
			if (!this.oQuick) {
				this.oQuick = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this.oQuick);
			}
			this.oQuick.setBindingContext(src.getBindingContext());
			this.oQuick.openBy(oEvt.getSource());
		},
		disPlayComment: function(oEvt) {
			var src = oEvt.getSource();
			var fragPath = "BillManagerWorklist.fragments.DisplayComment";
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();

			var obj = src.getBindingContext().getObject();
			worklistData.Comments = obj.Comments;

			worklistModel.setData(worklistData);
			worklistModel.refresh();
			if (!this.displayCmt) {
				this.displayCmt = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this.displayCmt);
			}
			this.displayCmt.openBy(oEvt.getSource());
		},
		handlCommentClose: function(oEvt) {
			this.displayCmt.close();
		},
		handleCommentAdd: function(oEvent) {
			var tbl = this.getView().byId('table');
			var src = oEvent.getSource();
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			if (worklistData.caller === "multi") {
				$.each(tbl.getSelectedContexts(), function(i, o) {
					var OData = o.getObject();
					OData.NewComments = worklistData.NewComments;
				});
			} else {
				var obj = src.getBindingContext().getObject();
				obj.NewComments = worklistData.NewComments;
			}

			this.oQuick.close();
		},
		onItemSelect: function(oEvt) {
			var tbl = oEvt.getSource();
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			var selItem = oEvt.getParameter("listItem");
			var isUniqueMatter = true;
			var currentMatter = selItem.getBindingContext().getProperty("Pspid");
			if (tbl.getSelectedContexts().length > 0) {
				var oData = tbl.getSelectedContexts()[0].getObject();
				$.each(tbl.getSelectedContexts(), function(i, o) {
					oData = o.getObject();
					if (currentMatter !== oData.Pspid) {
						isUniqueMatter = false;
					}
				});
			}
			worklistModel.setData(worklistData);
			worklistData.selItem = selItem;
				if (!isUniqueMatter) {
				MessageBox.warning(
					this.getResourceBundle().getText("uniqueMatterWarning"));
				selItem.setSelected(false);
			}
			if (selItem) {
				var commentCell = selItem.getCells()[8];
				commentCell.getContent()[0].setEnabled(selItem.getSelected());
				commentCell.getContent()[1].setEnabled(selItem.getSelected());
			}
		
		},
		getFirstWord: function(comment) {
			if (comment && comment !== "") {
				return comment.split(" ")[0];
			}
			return comment;
		},
		handleIconTabBarSelect: function(oEvent) {

		},
		handleMatterPress: function(oEvt) {
			var oLink = oEvt.getSource();
			var obj = oLink.getBindingContext().getObject();
			var matterData = {
				pages: [{
					pageId: "genericPageId",
					header: "Matter Detail",
					title: "Matter Detail",
					titleUrl: "",
					icon: "sap-icon://message-information",
					groups: [{
						elements: [{
							label: obj.Pspid,
							value: obj.Post1
						}, {
							label: obj.Kunnr,
							value: obj.Kunnrname
						}, {
							label: obj.Boffice,
							value: obj.Werksdesc
						}, {
							label: obj.Zzmcurr
						}]
					}]
				}]
			};
			var matterModel = new JSONModel();
			matterModel.setData(matterData);
			if (!this._oMatterQuickView) {
				var fragPath = "BillManagerWorklist.fragments.MatterQView";
				this._oMatterQuickView = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this._oMatterQuickView);
			}
			this._oMatterQuickView.setModel(matterModel);
			this._oMatterQuickView.openBy(oLink);
		},
		handleSortPress: function(oEvt) {
			var tbl = this.getView().byId("table");
			var oBinding, aSort = [],
				sPath;
			sPath = oEvt.getSource().data().sortField;
			oBinding = tbl.getBinding("items");
			var isDesc = false;
			if (oBinding.aSorters.length > 0) {
				isDesc = !oBinding.aSorters[0].bDescending;
			}
			aSort = new sap.ui.model.Sorter(sPath, isDesc);
			oBinding.sort(aSort);
		},
		handleTableRefresh: function(oEvt) {
			var tbl = this.getView().byId('table');
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			$.each(tbl.getSelectedItems(), function(i, selItem) {
				var commentCell = selItem.getCells()[8];
				commentCell.getContent()[0].setEnabled(false);
				commentCell.getContent()[1].setEnabled(false);
			});
			worklistData.saveFA = false;
			worklistData.saveFE = false;
			worklistData.saveASTE = false;
			worklistData.saveApr = false;
			worklistData.cancelDB = false;
			worklistData.saveButton = false;
			tbl.removeSelections();
			tbl.getModel().refresh();
		},
		delegateToUser: function(oEvent) {
			var tbl = this.getView().byId('table');
			if (tbl.getSelectedContexts().length === 0) {
				MessageBox.warning(
					"Please select a work item!");
				return;
			}
			var si = tbl.getSelectedContexts()[0].getObject();
			var filter = [new Filter("Pspid", "EQ", si.Pspid)];
			if (!this._valueHelpDialog) {
				var model = this.getView().getModel();
				this._valueHelpDialog = sap.ui.xmlfragment(
					"BillManagerWorklist.fragments.F4Help",
					this
				);
				this._valueHelpDialog.setModel(model);
				this.getView().addDependent(this._valueHelpDialog);
				this._valueHelpDialog.open();
			} else {
				this._valueHelpDialog.getBinding("items").filter(filter);
				this._valueHelpDialog.open();
			}
		},
		getGroupHeader: function(oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});
		},
		handleValueHelpBillofc: function(oEvent) {
			var sFrgmntName;
			sFrgmntName = "BillManagerWorklist.fragments.billingofc";
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(sFrgmntName, this);
				this.getView().addDependent(this._valueHelpDialog);
			}
			this._valueHelpDialog.getBinding("items").filter([]);
			this._valueHelpDialog.open();
		},
		_handleValueHelpConfirm: function(oEvent) {
			var aContext = oEvent.getParameter("selectedContexts")[0];
			this.onDelegateTo(aContext);
		},
		onDelegateTo: function(aContext) {
			var tbl = this.getView().byId('table');
			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);
			var that = this;
			try {
				var batchChanges = [];
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPRS_MY_WORKLIST_SRV/");
				oModel.attachRequestSent(this.onRequestSent);
			//	var selMatter = tbl.getSelectedContexts()[0].getObject();

				$.each(tbl.getSelectedContexts(), function(i, item) {
				//	if (item.getBindingContext()) {
						var OData = item.getObject();
					//	if (selMatter.Pspid === OData.Pspid) {
							OData.Action = "DELEGATE";
							OData.BillingPartner = aContext.getProperty("Parnr");
							batchChanges.push(oModel.createBatchOperation("/WorklistBillManagerSet", "POST", OData));
					//	}
				//	}
				});
				oModel.addBatchChangeOperations(batchChanges);
				//submit changes and refresh the table and display message&nbsp;\&nbsp;
				oModel.setUseBatch(true);

				oModel.submitBatch(function(data) {
					tbl.getModel().refresh();
					that.getView().setBusy(false);
					MessageBox.success(
						"Delegated successfully to User " + aContext.getProperty("Name"));
				}, function(err) {
					that.getView().setBusy(false);
					MessageBox.error(
						"Error occured!"
					);
				});
			} catch (e) {
				that.getView().setBusy(false);
			}
		},
		_handleValueHelpSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter("Name1", sap.ui.model.FilterOperator.Contains, sValue);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter]);
		},
		handleBOfficeConfirm: function(oEvent) {
			var aContext = oEvent.getParameter("selectedContexts")[0];
			var searchModel = this.getView().getModel("searchModel");
			searchModel.setProperty("/Boffice", aContext.getProperty("Werks"));
		},
		onGoPress: function(oEvt) {
			var searchModel = this.getView().getModel("searchModel");
			var sfilters = [];
			if (searchModel.getProperty("Boffice") !== "") {
				sfilters.push(new Filter("Boffice", "EQ", searchModel.getProperty("Boffice")));
			}
			if (searchModel.getProperty("WorkDateFrom") !== "") {
				sfilters.push(new Filter("WorkDateFrom", "GT", searchModel.getProperty("WorkDateFrom")));
			}
			if (searchModel.getProperty("WorkDateTo") !== "") {
				sfilters.push(new Filter("WorkDateTo", "LT", searchModel.getProperty("WorkDateTo")));
			}
			var tbl = this.getView().byId("table");
			var bind = tbl.getBinding("items");
			if (sfilters.length > 0) {
				bind.filter([new Filter(sfilters, true)]);
			}
		}
	});
});