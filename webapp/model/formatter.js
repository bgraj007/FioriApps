sap.ui.define([], function() {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		convertTimestamp: function(oDate, oTime) {
			var sDate = oDate.split("T");
			var sTime = oTime.slice(2, 4) + ":" + oTime.slice(5, 7) + ":" + oTime.slice(8, 10);
			var sTimestamp = sDate[0].concat("," + " " + sTime);
			return sTimestamp;
		},
		SeTStatusIcon: function(isError) {
			if (isError === "S") {
				return "sap-icon://message-success";
			} else if (isError === "E") {
				return "sap-icon://message-error";
			} else if (isError === "" || isError === null || isError === undefined) {
				return "";
			}
		},
		SeTStatusIconColor: function(isError) {
			if (isError === "S") {
				return "Green";
			} else if (isError === "E") {
				return "Red";
			}
		},
		SeTIconToolTip: function(isError) {
			if (isError === "S") {
				return "Checkout Successfull";
			} else if (isError === "E") {
				return "Error";
			} else if (isError === "" || isError === null || isError === undefined) {
				return "";
			}
		},
		toggleButtonColor: function(sComments) {
			if (sComments && sComments.length > 0) {
				return sap.m.ButtonType.Emphasized;
			}
			return sap.m.ButtonType.Default;
		},
		numberUnit: function(sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		}

	};

});