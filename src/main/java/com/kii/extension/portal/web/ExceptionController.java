package com.kii.extension.portal.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ExceptionController {


	@ExceptionHandler(PortalWebException.class)
	public ResponseEntity<String> handleServiceException(PortalWebException ex) {


		String error=ex.getErrorCode().toString();

		ResponseEntity<String> resp=new ResponseEntity(error,ex.getHttpStatus());
		return resp;
	}

}
