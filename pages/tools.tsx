import React, {useEffect, useState} from 'react';
import {NextPage} from 'next';
import {
  Box, Button, Collapse,
  Drawer, ImageList, ImageListItem, ImageListItemBar, List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText, ListSubheader,
  Toolbar,
} from '@mui/material';
import {ExpandLess, ExpandMore, Image as ImageIcon, AddPhotoAlternate} from '@mui/icons-material';
import Uploader from '../components/uploader';
import FileUnit from '../core/unit/file-unit';
import Request from '../core/unit/request';
import JSZip from 'jszip';
import moment from 'moment';
import {SnackbarProvider, useSnackbar} from 'notistack';
import CommonHead from '../components/common-head';
import {LoadingButton} from '@mui/lab';

interface Menu {
  title: string;
  icon: React.ReactElement;
  href: string;
  open?: boolean;
  children?: Menu[];
}

const Tools: NextPage = () => {
  const description = '对低质图片进行去雾,无损放大,对比度增强等多种处理,优化重建高清图像.可用于提升相册图像质量,提升视频监控质量等.';
  const keywords = '图像增强,图片增强';
  const {enqueueSnackbar} = useSnackbar();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  useEffect(() => {
    setMenus([
      {
        title: '图像处理',
        icon: <ImageIcon />,
        href: '/tools/image',
        open: true,
        children: [
          {
            title: '图像清晰度增强',
            icon: <AddPhotoAlternate />,
            href: '/tools/image',
          },
        ],
      },
    ]);
  }, []);
  const handleClick = (index: number) => {
    setMenus(menus.map((menu, _index) => _index === index ? {...menu, open: !menu.open} : menu));
  };
  const [selectedImages, setSelectedImages] = useState<{file: File, path: string}[]>([]);
  const [enhancedImages, setEnhancedImages] = useState<string[]>([]);
  const run = async () => {
    setEnhancing(true);
    try {
      const base64Images = (await Promise.all(selectedImages.map(({file}) => FileUnit.toBase64(file)))) as string[];
      const base64ImageContents = base64Images.map((base64Image) => base64Image.split(',')[1]);
      const host = process.env['NEXT_PUBLIC_MIDDLEWARE_URL'];
      const url = '/images/enhance';
      const requests = base64ImageContents.map((item) => new Request(host).post(url, {ImageBase64: item}));
      const responses = await Promise.all(requests);
      const base64ImageHead = base64Images.map((base64Image) => base64Image.split(',')[0]);
      setEnhancedImages(responses.map(({EnhancedImage}, index) => `${base64ImageHead[index]},${EnhancedImage}`));
      enqueueSnackbar('图像处理完成', {variant: 'success'});
    } catch (error: any) {
      enqueueSnackbar(error.message, {variant: 'error'});
    }
    setEnhancing(false);
  };
  const download = () => {
    const zip = new JSZip();
    const fileNames = selectedImages.map(({file}) => file.name);
    const enhancedImageContents = enhancedImages.map((enhancedImage) => enhancedImage.split(',')[1]);
    enhancedImageContents.forEach((enhancedImageContent, index) => {
      zip.file(fileNames[index], enhancedImageContent, {base64: true});
    });
    zip.generateAsync({type: 'blob'}).then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `图像清晰度增强包 ${moment().format('YYYYMMDDHHmmss')}.zip`;
      a.click();
      enqueueSnackbar('下载完成, 请到下载管理器查看', {variant: 'success'});
    }).catch((err) => {
      console.log(err);
    });
  };
  return (
    <Box sx={{display: 'flex', height: 'calc(100vh - 64px)'}}>
      <CommonHead title={'工具-图像清晰度增强'} description={description} keywords={keywords}/>
      <Drawer
        variant="permanent"
        sx={{[`& .MuiDrawer-paper`]: {boxSizing: 'border-box', position: 'relative'}}}>
        <List>
          {menus.map((menu, index) => (
            <div key={index}>
              <ListItemButton onClick={() => handleClick(index)}>
                <ListItemIcon>{menu.icon}</ListItemIcon>
                <ListItemText primary={menu.title}/>
                {menu.open ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              {menu.children?.length && (
                <Collapse in={menu.open}>
                  <List disablePadding component="div">
                    {menu.children.map((child, index) => (
                      <ListItem button key={index} sx={{pl: 4}}>
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.title}/>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </div>
          ))}
        </List>
      </Drawer>
      <Box sx={{flex: 1, background: '#eee'}}>
        <Toolbar>
          <Uploader onChange={(e) => setSelectedImages(e)}/>
          <LoadingButton
            sx={{color: '#fff', marginLeft: '10px'}}
            variant="contained"
            loading={enhancing}
            onClick={run} disabled={!(selectedImages.length && !enhancedImages.length)}>开始增强</LoadingButton>
          <Button
            sx={{color: '#fff', marginLeft: '10px'}}
            variant="contained"
            onClick={download} disabled={!enhancedImages.length}>一键下载</Button>
        </Toolbar>
        <Box sx={{display: 'flex', width: '100%'}}>
          <Box sx={{flex: 1}}>
            <ListSubheader component="div">源文件</ListSubheader>
            <Box sx={{overflowY: 'scroll', height: 'calc(100vh - 190px)'}}>
              <ImageList variant={'masonry'} cols={3}>
                {selectedImages.map((image, index) => (
                  <ImageListItem key={index}>
                    <Box sx={{position: 'relative'}}>
                      {/* <Image src={image.path} layout={'fill'} objectFit={'none'}/>*/}
                      <img
                        src={`${image.path}`}
                        style={{width: '100%'}}
                        loading="lazy"
                      />
                    </Box>
                    <ImageListItemBar subtitle={image.file.name} title={(image.file.size/1024).toFixed() + 'kb'}/>
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          </Box>
          <Box sx={{flex: 1}}>
            <ListSubheader component="div">增强后</ListSubheader>
            <Box sx={{overflowY: 'scroll', height: 'calc(100vh - 190px)'}}>
              <ImageList variant={'masonry'} cols={3}>
                {enhancedImages.map((image, index) => (
                  <ImageListItem key={index}>
                    <Box sx={{position: 'relative'}}>
                      {/* <Image src={image.path} layout={'fill'} objectFit={'none'}/>*/}
                      <img
                        src={`${image}`}
                        style={{width: '100%'}}
                        loading="lazy"
                      />
                    </Box>
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
const IntegrationNotice = () => (
  <SnackbarProvider dense={true} maxSnack={1}>
    <Tools/>
  </SnackbarProvider>
);
export default IntegrationNotice;
