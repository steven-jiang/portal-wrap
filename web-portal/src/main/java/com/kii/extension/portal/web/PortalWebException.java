package com.kii.extension.portal.web;

import org.springframework.http.HttpStatus;

import com.kii.extension.portal.entity.ErrorCode;
import com.kii.extension.portal.store.AppStoreException;


public class PortalWebException extends RuntimeException {

	private HttpStatus httpStatus;

	private String errorCode;

	public PortalWebException(Exception e,ErrorCode errorCode) {
		super(e);
		this.errorCode=errorCode.getErrorInfo();
		this.httpStatus=HttpStatus.valueOf(errorCode.getStatus());
	}

	public PortalWebException(AppStoreException e){
		super(e);
		this.errorCode=e.getMessage();
		this.httpStatus=HttpStatus.valueOf(500);
	}

	public PortalWebException(ErrorCode errorCode){
		super();
		this.errorCode=errorCode.getErrorInfo();
		this.httpStatus=HttpStatus.valueOf(errorCode.getStatus());
	}



	public String getErrorCode() {
		return errorCode;
	}

	public HttpStatus getHttpStatus() {
		return httpStatus;
	}
}
