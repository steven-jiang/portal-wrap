package com.kii.extension.portal.web;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.web.servlet.handler.HandlerInterceptorAdapter;

public class OptionalInterceptorAdapter extends HandlerInterceptorAdapter {


	private static final String ACCESS_CONTROL_ALLOW_ORIGIN = "Access-Control-Allow-Origin";

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {


		if(request.getMethod().equals("OPTIONS")){

			response.setHeader(ACCESS_CONTROL_ALLOW_ORIGIN, "*");
			response.addHeader("Access-Control-Allow-Headers","accept, Authorization,x-kii-path,x-kii-sdk, x-kii-appid, content-type, x-kii-appkey");
			response.addHeader("Access-Control-Expose-Headers","Content-Type, Authorization, Content-Length, X-Requested-With, ETag");
			response.addHeader("Allow","GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS, PATCH");
			response.addHeader("Access-Control-Allow-Methods","POST, GET, PUT, OPTIONS, PATCH, HEAD, DELETE");


		}else{
			response.setHeader(ACCESS_CONTROL_ALLOW_ORIGIN, "*");

		}
		return true;

	}


}
