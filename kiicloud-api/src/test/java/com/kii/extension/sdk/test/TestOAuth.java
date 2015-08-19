package com.kii.extension.sdk.test;


import static junit.framework.TestCase.assertNotNull;

import org.apache.commons.logging.LogFactory;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.kii.extension.sdk.entity.LoginInfo;
import com.kii.extension.sdk.impl.KiiCloudClient;
import com.kii.extension.sdk.service.AppBindTool;
import com.kii.extension.sdk.service.KiiCloudService;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations={
		"classpath:com/kii/extension/sdk/testContext.xml"})
public class TestOAuth {

	@Autowired
	private KiiCloudService service;

	@Autowired
	private AppBindTool tool;

	@Autowired
	private ObjectMapper mapper;

	@Test
	public void testOAuth(){



			LoginInfo info=service.adminLogin();

			assertNotNull(info.getToken());





	}
}
