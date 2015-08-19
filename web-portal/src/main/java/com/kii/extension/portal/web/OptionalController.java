package com.kii.extension.portal.web;

import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class OptionalController {


	@RequestMapping(method = RequestMethod.OPTIONS)
	public void accessApps(HttpServletResponse response){

		addOptionsHeader(response);
	}



	private void addOptionsHeader(HttpServletResponse response) {
		response.addHeader("Access-Control-Allow-Headers","accept, Authorization,x-kii-path,x-kii-sdk, x-kii-appid, content-type, x-kii-appkey");
		response.addHeader("Access-Control-Allow-Origin","*");
		response.addHeader("Access-Control-Expose-Headers","Content-Type, Authorization, Content-Length, X-Requested-With, ETag");
		response.addHeader("Allow","GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS, PATCH");
		response.addHeader("Access-Control-Allow-Methods","POST, GET, PUT, OPTIONS, PATCH, HEAD, DELETE");
	}
}
