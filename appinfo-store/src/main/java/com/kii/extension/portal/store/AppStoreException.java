package com.kii.extension.portal.store;

import java.security.GeneralSecurityException;

public class AppStoreException extends RuntimeException {

	public AppStoreException(Exception e,String error){

			super(error,e);
	}
}
