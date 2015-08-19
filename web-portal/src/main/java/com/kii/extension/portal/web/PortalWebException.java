package com.kii.extension.portal.web;

public class PortalWebException extends RuntimeException {

	public PortalWebException(Exception e){
		super(e);
	}

	public PortalWebException(){
		super();
	}
}
