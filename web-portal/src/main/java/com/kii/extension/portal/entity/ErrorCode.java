package com.kii.extension.portal.entity;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	INVALID_TOKEN("the token invalid",403),
	STORE_ACCESS_FAIL("app info store access fail",500),
	JSON_FORMAT_ERROR("json format error",500),
	IO_EXCEPTION("io exception",500 ), LOGIN_FAIL("login fail", 403);



	private int status;

	private String info;



	ErrorCode(String info,int status){
		this.status=status;
		this.info=info;
	}

	public int getStatus(){

		return status;
	}

	public String getErrorInfo(){
		return info;
	}
}
