package com.kii.extension.portal.store;

public class AppStoreException extends RuntimeException {

	public AppStoreException(Exception e,String error){

			super(error,e);
	}
}
