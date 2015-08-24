package com.kii.extension.portal.web;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.kii.extension.portal.entity.ErrorCode;
import com.kii.extension.portal.entity.LoginParam;
import com.kii.extension.portal.service.TokenManager;
import com.kii.extension.portal.store.AppInfoStore;
import com.kii.extension.sdk.entity.LoginInfo;

@Controller
public class LoginController {

	@Autowired
	private ObjectMapper mapper;

	@Autowired
	private AppInfoStore appInfoService;

	@Autowired
	private TokenManager tokenManager;


	@RequestMapping(path="/oauth2/token",method={RequestMethod.POST})
	public ResponseEntity login(HttpEntity<String> entity){



		String body=entity.getBody();

		try {
			LoginParam param=mapper.readValue(body,LoginParam.class);

			String name=param.getAdminName();
			String pwd=param.getSecret();

			boolean sign=appInfoService.verifyUser(name,pwd);

			if(sign==false){

				throw  new PortalWebException(ErrorCode.LOGIN_FAIL);
			}else{

				String token=tokenManager.getNewToken(name);
				LoginInfo info=new LoginInfo();
				info.setToken(token);
				info.setExpainIn(System.currentTimeMillis() + TokenManager.ttl);
				info.setUserID(name);

				String json=mapper.writeValueAsString(info);

				MultiValueMap<String, String> headers=new LinkedMultiValueMap<>();
				headers.add("Content-Type","application/json");
//				HttpEntity resp=new HttpEntity(json);

				ResponseEntity resp=new ResponseEntity(json,headers,HttpStatus.OK);

				return resp;

			}

		} catch (IOException e) {
			throw  new PortalWebException(ErrorCode.IO_EXCEPTION);
		}


	}

}
